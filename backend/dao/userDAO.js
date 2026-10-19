const mongoose = require('mongoose');
const {
  User,
  Course,
  CourseInstructor,
  CourseEnrollment,
  Assignment,
  AssignmentSubmission,
  LiveSession,
  SessionAttendance,
} = require('../models');

class UserDAO {
  /**
   * Create a new user in MongoDB
   */
  async createUser({ email, password, full_name, role, avatar_url }) {
    const user = new User({
      email: email.toLowerCase().trim(),
      password,
      full_name: full_name.trim(),
      role: role || 'student',
      avatar_url: avatar_url || null,
    });

    const saved = await user.save();
    return saved.toJSON();
  }

  /**
   * Find user by email (including password for auth verification)
   */
  async findUserByEmailWithPassword(email) {
    if (!email) return null;
    return User.findOne({ email: email.toLowerCase().trim() });
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email) {
    if (!email) return null;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    return user ? user.toJSON() : null;
  }

  /**
   * Find user by ID
   */
  async findUserById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const user = await User.findById(id);
    return user ? user.toJSON() : null;
  }

  /**
   * Update user profile
   */
  async updateUser(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    return user ? user.toJSON() : null;
  }

  /**
   * Delete user
   */
  async deleteUser(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    await Promise.allSettled([
      CourseInstructor.deleteMany({ instructor_id: id }),
      CourseEnrollment.deleteMany({ student_id: id }),
      AssignmentSubmission.deleteMany({ student_id: id }),
      SessionAttendance.deleteMany({ student_id: id }),
    ]);
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * List users with optional role and search filtering
   */
  async getUsers({ role, search } = {}) {
    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ full_name: regex }, { email: regex }];
    }

    const users = await User.find(query).sort({ created_at: -1 });
    return users.map((u) => u.toJSON());
  }

  /**
   * Get all instructors
   */
  async getInstructors() {
    const instructors = await User.find({ role: 'instructor' }).sort({ full_name: 1 });
    return instructors.map((i) => i.toJSON());
  }

  /**
   * Get all students
   */
  async getStudents() {
    const students = await User.find({ role: 'student' }).sort({ full_name: 1 });
    return students.map((s) => s.toJSON());
  }

  /**
   * Get overall system stats from real database records
   */
  async getAdminStats() {
    const [
      totalStudents,
      totalInstructors,
      totalCourses,
      totalSessions,
      totalAssignments,
      totalSubmissions,
      totalAttendanceRecords,
      recentUsers,
      recentCourses,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'instructor' }),
      Course.countDocuments(),
      LiveSession.countDocuments(),
      Assignment.countDocuments(),
      AssignmentSubmission.countDocuments(),
      SessionAttendance.countDocuments(),
      User.find().sort({ created_at: -1 }).limit(5),
      Course.find().sort({ created_at: -1 }).limit(5),
    ]);

    return {
      totalStudents,
      totalInstructors,
      totalCourses,
      totalSessions,
      totalAssignments,
      totalSubmissions,
      totalAttendanceRecords,
      recentUsers: recentUsers.map((u) => u.toJSON()),
      recentCourses: recentCourses.map((c) => c.toJSON()),
    };
  }

  /**
   * Get dashboard statistics for a student
   */
  async getStudentStats(studentId) {
    const [enrolledCourses, submittedAssignments, attendedSessions] = await Promise.all([
      CourseEnrollment.countDocuments({ student_id: studentId }),
      AssignmentSubmission.countDocuments({ student_id: studentId }),
      SessionAttendance.countDocuments({ student_id: studentId, status: 'PRESENT' }),
    ]);

    return {
      enrolledCourses,
      submittedAssignments,
      attendedSessions,
    };
  }

  /**
   * Get dashboard statistics for an instructor
   */
  async getInstructorStats(instructorId) {
    const assigned = await CourseInstructor.find({ instructor_id: instructorId });
    const courseIds = assigned.map((a) => a.course_id);

    if (courseIds.length === 0) {
      return {
        assignedCourses: 0,
        totalStudents: 0,
        totalAssignments: 0,
        totalSessions: 0,
      };
    }

    const [totalStudents, totalAssignments, totalSessions] = await Promise.all([
      CourseEnrollment.countDocuments({ course_id: { $in: courseIds } }),
      Assignment.countDocuments({ course_id: { $in: courseIds } }),
      LiveSession.countDocuments({ course_id: { $in: courseIds } }),
    ]);

    return {
      assignedCourses: courseIds.length,
      totalStudents,
      totalAssignments,
      totalSessions,
    };
  }
}

module.exports = new UserDAO();
