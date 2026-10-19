const mongoose = require('mongoose');
const {
  Course,
  CourseInstructor,
  CourseEnrollment,
  Assignment,
  Material,
  LiveSession,
  CourseZoomMeeting,
  User,
} = require('../models');

class CourseDAO {
  /**
   * Create a new course record in MongoDB
   */
  async createCourse({ course_code, course_name, description, created_by }) {
    const course = new Course({
      course_code: course_code.toUpperCase().trim(),
      course_name: course_name.trim(),
      description: description ? description.trim() : '',
      created_by: created_by || null,
    });
    const saved = await course.save();
    return saved.toJSON();
  }

  /**
   * Find a course by course_code
   */
  async findCourseByCode(course_code) {
    if (!course_code) return null;
    const course = await Course.findOne({ course_code: course_code.toUpperCase().trim() });
    return course ? course.toJSON() : null;
  }

  /**
   * Get all courses with enriched instructor and student count info
   */
  async getAllCourses() {
    const courses = await Course.find().sort({ created_at: -1 });

    const enriched = await Promise.all(
      courses.map(async (course) => {
        const courseId = course._id;

        // Fetch instructors
        const instructorLinks = await CourseInstructor.find({ course_id: courseId })
          .populate('instructor_id', 'full_name email role avatar_url');
        const instructors = instructorLinks
          .map((link) => link.instructor_id)
          .filter(Boolean)
          .map((u) => (u.toJSON ? u.toJSON() : u));

        // Count enrolled students
        const studentCount = await CourseEnrollment.countDocuments({ course_id: courseId });

        // Get upcoming session
        const upcomingSession = await LiveSession.findOne({
          course_id: courseId,
          scheduled_time: { $gte: new Date() },
          status: { $ne: 'cancelled' },
        })
          .sort({ scheduled_time: 1 })
          .limit(1);

        const courseJson = course.toJSON();
        return {
          ...courseJson,
          instructors,
          studentCount,
          upcomingSession: upcomingSession ? upcomingSession.toJSON() : null,
        };
      })
    );

    return enriched;
  }

  /**
   * Get courses taught by a specific instructor
   */
  async getCoursesByInstructor(instructorId) {
    const assignments = await CourseInstructor.find({ instructor_id: instructorId });
    const courseIds = assignments.map((a) => a.course_id);

    const courses = await Course.find({ _id: { $in: courseIds } }).sort({ created_at: -1 });

    const enriched = await Promise.all(
      courses.map(async (course) => {
        const courseId = course._id;
        const studentCount = await CourseEnrollment.countDocuments({ course_id: courseId });
        const instructorLinks = await CourseInstructor.find({ course_id: courseId })
          .populate('instructor_id', 'full_name email role avatar_url');
        const instructors = instructorLinks
          .map((link) => link.instructor_id)
          .filter(Boolean)
          .map((u) => (u.toJSON ? u.toJSON() : u));

        return {
          ...course.toJSON(),
          instructors,
          studentCount,
        };
      })
    );

    return enriched;
  }

  /**
   * Get courses enrolled by a specific student
   */
  async getCoursesByStudent(studentId) {
    const enrollments = await CourseEnrollment.find({ student_id: studentId });
    const courseIds = enrollments.map((e) => e.course_id);

    const courses = await Course.find({ _id: { $in: courseIds } }).sort({ created_at: -1 });

    const enriched = await Promise.all(
      courses.map(async (course) => {
        const courseId = course._id;
        const instructorLinks = await CourseInstructor.find({ course_id: courseId })
          .populate('instructor_id', 'full_name email role avatar_url');
        const instructors = instructorLinks
          .map((link) => link.instructor_id)
          .filter(Boolean)
          .map((u) => (u.toJSON ? u.toJSON() : u));

        const upcomingSession = await LiveSession.findOne({
          course_id: courseId,
          scheduled_time: { $gte: new Date() },
          status: { $ne: 'cancelled' },
        })
          .sort({ scheduled_time: 1 })
          .limit(1);

        return {
          ...course.toJSON(),
          instructors,
          upcomingSession: upcomingSession ? upcomingSession.toJSON() : null,
        };
      })
    );

    return enriched;
  }

  /**
   * Get course by ID with detailed info
   */
  async getCourseById(courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return null;
    }

    const course = await Course.findById(courseId);
    if (!course) return null;

    const [instructorLinks, enrollmentLinks, upcomingSession] = await Promise.all([
      CourseInstructor.find({ course_id: courseId }).populate('instructor_id', 'full_name email role avatar_url'),
      CourseEnrollment.find({ course_id: courseId }).populate('student_id', 'full_name email role avatar_url'),
      LiveSession.findOne({
        course_id: courseId,
        scheduled_time: { $gte: new Date() },
        status: { $ne: 'cancelled' },
      })
        .sort({ scheduled_time: 1 })
        .limit(1),
    ]);

    const instructors = instructorLinks
      .map((link) => link.instructor_id)
      .filter(Boolean)
      .map((u) => (u.toJSON ? u.toJSON() : u));

    const students = enrollmentLinks
      .map((link) => link.student_id)
      .filter(Boolean)
      .map((u) => (u.toJSON ? u.toJSON() : u));

    return {
      ...course.toJSON(),
      instructors,
      students,
      studentCount: students.length,
      upcomingSession: upcomingSession ? upcomingSession.toJSON() : null,
    };
  }

  /**
   * Update course details
   */
  async updateCourse(courseId, updateData) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return null;
    }

    const updated = await Course.findByIdAndUpdate(courseId, { $set: updateData }, { new: true, runValidators: true });
    return updated ? updated.toJSON() : null;
  }

  /**
   * Delete course by ID and safely cascade delete dependent records
   */
  async deleteCourse(courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return false;
    }

    await Promise.allSettled([
      CourseInstructor.deleteMany({ course_id: courseId }),
      CourseEnrollment.deleteMany({ course_id: courseId }),
      Assignment.deleteMany({ course_id: courseId }),
      Material.deleteMany({ course_id: courseId }),
      LiveSession.deleteMany({ course_id: courseId }),
      CourseZoomMeeting.deleteMany({ course_id: courseId }),
    ]);

    const result = await Course.findByIdAndDelete(courseId);
    return !!result;
  }

  /**
   * Assign instructor to course
   */
  async assignInstructor(courseId, instructorId) {
    const existing = await CourseInstructor.findOne({
      course_id: courseId,
      instructor_id: instructorId,
    });

    if (existing) {
      return existing.toJSON();
    }

    const link = new CourseInstructor({
      course_id: courseId,
      instructor_id: instructorId,
    });
    const saved = await link.save();
    return saved.toJSON();
  }

  /**
   * Unassign instructor from course
   */
  async unassignInstructor(courseId, instructorId) {
    const result = await CourseInstructor.deleteOne({
      course_id: courseId,
      instructor_id: instructorId,
    });
    return result.deletedCount > 0;
  }

  /**
   * Enroll student in course
   */
  async enrollStudent(courseId, studentId) {
    const existing = await CourseEnrollment.findOne({
      course_id: courseId,
      student_id: studentId,
    });

    if (existing) {
      return existing.toJSON();
    }

    const link = new CourseEnrollment({
      course_id: courseId,
      student_id: studentId,
    });
    const saved = await link.save();
    return saved.toJSON();
  }

  /**
   * Unenroll student from course
   */
  async unenrollStudent(courseId, studentId) {
    const result = await CourseEnrollment.deleteOne({
      course_id: courseId,
      student_id: studentId,
    });
    return result.deletedCount > 0;
  }

  /**
   * Check if instructor is assigned to course
   */
  async isInstructorAssigned(courseId, instructorId) {
    if (!courseId || !instructorId) return false;
    const count = await CourseInstructor.countDocuments({
      course_id: courseId,
      instructor_id: instructorId,
    });
    return count > 0;
  }

  /**
   * Check if student is enrolled in course
   */
  async isStudentEnrolled(courseId, studentId) {
    if (!courseId || !studentId) return false;
    const count = await CourseEnrollment.countDocuments({
      course_id: courseId,
      student_id: studentId,
    });
    return count > 0;
  }
}

module.exports = new CourseDAO();
