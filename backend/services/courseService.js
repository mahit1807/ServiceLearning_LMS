const courseDAO = require('../dao/courseDAO');

class CourseService {
  /**
   * Helper: Generate a unique 7-character alphanumeric course code
   */
  async generateUniqueCourseCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 20) {
      attempts++;
      code = '';
      for (let i = 0; i < 7; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const existing = await courseDAO.findCourseByCode(code);
      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      // Append timestamp suffix in extreme collision case
      code = 'C' + Date.now().toString(36).toUpperCase().slice(-6);
    }

    return code;
  }

  /**
   * Create a new course
   */
  async createCourse({ course_name, description, instructor_id }, user) {
    if (!course_name || !course_name.trim()) {
      const error = new Error('Course name is required');
      error.statusCode = 400;
      throw error;
    }

    if (!user || !['admin', 'instructor'].includes(user.role)) {
      const error = new Error('Only administrators and instructors can create courses');
      error.statusCode = 403;
      throw error;
    }

    const courseCode = await this.generateUniqueCourseCode();

    const course = await courseDAO.createCourse({
      course_code: courseCode,
      course_name: course_name.trim(),
      description: description ? description.trim() : '',
    });

    // Determine instructor to assign: creator if instructor, or instructor_id if specified by admin
    const targetInstructorId = user.role === 'instructor' ? user.id : instructor_id;

    if (targetInstructorId) {
      try {
        await courseDAO.assignInstructor(course.id, targetInstructorId);
      } catch (err) {
        console.warn('Failed to assign instructor to course:', err.message);
      }
    }

    return course;
  }

  /**
   * Get courses according to user role
   */
  async getCourses(user) {
    if (!user) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      throw error;
    }

    if (user.role === 'admin') {
      return courseDAO.getAllCourses();
    } else if (user.role === 'instructor') {
      return courseDAO.getCoursesByInstructor(user.id);
    } else {
      return courseDAO.getCoursesByStudent(user.id);
    }
  }

  /**
   * Get all courses (admin view)
   */
  async getAllCoursesAdmin() {
    return courseDAO.getAllCourses();
  }

  /**
   * Get a course by ID with permission checks
   */
  async getCourseById(courseId, user) {
    if (!courseId) {
      const error = new Error('Course ID is required');
      error.statusCode = 400;
      throw error;
    }

    const course = await courseDAO.getCourseById(courseId);
    if (!course) {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }

    // Role-based access validation
    if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(courseId, user.id);
      if (!isAssigned) {
        const error = new Error('Access denied: You are not assigned to this course');
        error.statusCode = 403;
        throw error;
      }
    } else if (user.role === 'student') {
      const isEnrolled = await courseDAO.isStudentEnrolled(courseId, user.id);
      if (!isEnrolled) {
        const error = new Error('Access denied: You are not enrolled in this course');
        error.statusCode = 403;
        throw error;
      }
    }

    return course;
  }

  /**
   * Update course details
   */
  async updateCourse(courseId, updateData, user) {
    if (!user || !['admin', 'instructor'].includes(user.role)) {
      const error = new Error('Permission denied');
      error.statusCode = 403;
      throw error;
    }

    const existing = await courseDAO.getCourseById(courseId);
    if (!existing) {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(courseId, user.id);
      if (!isAssigned) {
        const error = new Error('You can only update courses you instruct');
        error.statusCode = 403;
        throw error;
      }
    }

    const payload = {};
    if (updateData.course_name !== undefined) {
      if (!updateData.course_name.trim()) {
        const error = new Error('Course name cannot be empty');
        error.statusCode = 400;
        throw error;
      }
      payload.course_name = updateData.course_name.trim();
    }

    if (updateData.description !== undefined) {
      payload.description = updateData.description.trim();
    }

    // Preserve existing course_id and course_code unless explicitly regenerated
    if (updateData.regenerate_code === true || updateData.regenerate_code === 'true') {
      payload.course_code = await this.generateUniqueCourseCode();
    }

    const updated = await courseDAO.updateCourse(courseId, payload);

    // If instructor assignment update requested (admin only)
    if (updateData.instructor_id && user.role === 'admin') {
      await courseDAO.assignInstructor(courseId, updateData.instructor_id);
    }

    return updated;
  }

  /**
   * Delete course with foreign key and dependency handling
   */
  async deleteCourse(courseId, user) {
    if (!user || !['admin', 'instructor'].includes(user.role)) {
      const error = new Error('Permission denied');
      error.statusCode = 403;
      throw error;
    }

    const existing = await courseDAO.getCourseById(courseId);
    if (!existing) {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(courseId, user.id);
      if (!isAssigned) {
        const error = new Error('You can only delete courses you instruct');
        error.statusCode = 403;
        throw error;
      }
    }

    const success = await courseDAO.deleteCourse(courseId);
    return { success, message: 'Course and related dependencies deleted successfully' };
  }

  /**
   * Assign instructor to course
   */
  async assignInstructor(courseId, instructorId, user) {
    if (!user || user.role !== 'admin') {
      const error = new Error('Only administrators can assign instructors');
      error.statusCode = 403;
      throw error;
    }

    return courseDAO.assignInstructor(courseId, instructorId);
  }

  /**
   * Enroll student in course
   */
  async enrollStudent(courseId, studentId, user) {
    if (!user || user.role !== 'admin') {
      const error = new Error('Only administrators can enroll students');
      error.statusCode = 403;
      throw error;
    }

    return courseDAO.enrollStudent(courseId, studentId);
  }

  /**
   * Unenroll student from course
   */
  async unenrollStudent(courseId, studentId, user) {
    if (!user || user.role !== 'admin') {
      const error = new Error('Only administrators can unenroll students');
      error.statusCode = 403;
      throw error;
    }

    return courseDAO.unenrollStudent(courseId, studentId);
  }
}

module.exports = new CourseService();
