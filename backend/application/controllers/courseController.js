const courseService = require('../../services/courseService');

class CourseController {
  /**
   * POST /admin/courses – Create course
   */
  async createCourse(req, res) {
    try {
      const { course_name, description, instructor_id } = req.body;
      if (!course_name || !course_name.trim()) {
        return res.status(400).json({ error: 'Course name is required' });
      }

      const course = await courseService.createCourse(
        { course_name, description, instructor_id },
        req.user
      );

      return res.status(201).json({
        message: 'Course created successfully',
        course,
      });
    } catch (err) {
      console.error('CourseController.createCourse error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to create course',
      });
    }
  }

  /**
   * GET /admin/courses – List all courses (admin view)
   */
  async getAllCoursesAdmin(req, res) {
    try {
      const courses = await courseService.getAllCoursesAdmin();
      return res.status(200).json({ courses });
    } catch (err) {
      console.error('CourseController.getAllCoursesAdmin error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch courses',
      });
    }
  }

  /**
   * GET /courses – List courses for current user based on role
   */
  async getCourses(req, res) {
    try {
      const courses = await courseService.getCourses(req.user);
      return res.status(200).json({ courses });
    } catch (err) {
      console.error('CourseController.getCourses error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch courses',
      });
    }
  }

  /**
   * GET /admin/courses/:courseId or GET /courses/:courseId – Get course details
   */
  async getCourseById(req, res) {
    try {
      const { courseId } = req.params;
      const course = await courseService.getCourseById(courseId, req.user);
      return res.status(200).json({ course });
    } catch (err) {
      console.error('CourseController.getCourseById error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch course details',
      });
    }
  }

  /**
   * PUT /admin/courses/:courseId – Update course
   */
  async updateCourse(req, res) {
    try {
      const { courseId } = req.params;
      const { course_name, description, instructor_id, regenerate_code } = req.body;

      if (!course_name && description === undefined && !instructor_id && !regenerate_code) {
        return res.status(400).json({ error: 'At least one field to update is required' });
      }

      const updated = await courseService.updateCourse(
        courseId,
        { course_name, description, instructor_id, regenerate_code },
        req.user
      );

      return res.status(200).json({
        message: 'Course updated successfully',
        course: updated,
      });
    } catch (err) {
      console.error('CourseController.updateCourse error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to update course',
      });
    }
  }

  /**
   * DELETE /admin/courses/:courseId – Delete course
   */
  async deleteCourse(req, res) {
    try {
      const { courseId } = req.params;
      const result = await courseService.deleteCourse(courseId, req.user);
      return res.status(200).json(result);
    } catch (err) {
      console.error('CourseController.deleteCourse error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to delete course',
      });
    }
  }

  /**
   * POST /admin/assign-instructor – Assign instructor
   */
  async assignInstructor(req, res) {
    try {
      const { course_id, instructor_id } = req.body;
      if (!course_id || !instructor_id) {
        return res.status(400).json({ error: 'Course ID and Instructor ID are required' });
      }

      const result = await courseService.assignInstructor(course_id, instructor_id, req.user);
      return res.status(200).json({
        message: 'Instructor assigned successfully',
        data: result,
      });
    } catch (err) {
      console.error('CourseController.assignInstructor error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to assign instructor',
      });
    }
  }

  /**
   * POST /admin/enroll-student – Enroll student
   */
  async enrollStudent(req, res) {
    try {
      const { course_id, student_id } = req.body;
      if (!course_id || !student_id) {
        return res.status(400).json({ error: 'Course ID and Student ID are required' });
      }

      const result = await courseService.enrollStudent(course_id, student_id, req.user);
      return res.status(200).json({
        message: 'Student enrolled successfully',
        data: result,
      });
    } catch (err) {
      console.error('CourseController.enrollStudent error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to enroll student',
      });
    }
  }

  /**
   * DELETE /admin/unenroll-student – Unenroll student
   */
  async unenrollStudent(req, res) {
    try {
      const { course_id, student_id } = req.body;
      if (!course_id || !student_id) {
        return res.status(400).json({ error: 'Course ID and Student ID are required' });
      }

      await courseService.unenrollStudent(course_id, student_id, req.user);
      return res.status(200).json({
        message: 'Student unenrolled successfully',
      });
    } catch (err) {
      console.error('CourseController.unenrollStudent error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to unenroll student',
      });
    }
  }
}

module.exports = new CourseController();
