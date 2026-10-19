const mongoose = require('mongoose');
const {
  Assignment,
  AssignmentSubmission,
  Course,
  User,
} = require('../models');

class AssignmentDAO {
  /**
   * Create a new assignment record in MongoDB
   */
  async createAssignment({
    course_id,
    title,
    description,
    due_date,
    created_by,
    attachment_path,
    attachment_name,
  }) {
    const assignment = new Assignment({
      course_id,
      title: title.trim(),
      description: description ? description.trim() : '',
      due_date: due_date ? new Date(due_date) : null,
      created_by,
      attachment_path: attachment_path || null,
      attachment_name: attachment_name || null,
    });

    const saved = await assignment.save();
    return saved.toJSON();
  }

  /**
   * Get assignments by course ID with submission statistics
   */
  async getAssignmentsByCourse(courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return [];
    }

    const assignments = await Assignment.find({ course_id: courseId })
      .sort({ created_at: -1 });

    const enriched = await Promise.all(
      assignments.map(async (a) => {
        const submissionCount = await AssignmentSubmission.countDocuments({ assignment_id: a._id });
        const aJson = a.toJSON();
        return {
          ...aJson,
          submissionCount,
        };
      })
    );

    return enriched;
  }

  /**
   * Get single assignment by ID
   */
  async getAssignmentById(assignmentId) {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return null;
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return null;

    const submissionCount = await AssignmentSubmission.countDocuments({ assignment_id: assignment._id });
    const aJson = assignment.toJSON();

    return {
      ...aJson,
      submissionCount,
    };
  }

  /**
   * Update assignment details
   */
  async updateAssignment(assignmentId, updateData) {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return null;
    }

    const updated = await Assignment.findByIdAndUpdate(
      assignmentId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return updated ? updated.toJSON() : null;
  }

  /**
   * Delete assignment and its submissions
   */
  async deleteAssignment(assignmentId) {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return false;
    }

    await AssignmentSubmission.deleteMany({ assignment_id: assignmentId });
    const result = await Assignment.findByIdAndDelete(assignmentId);
    return !!result;
  }

  /**
   * Create or update student submission
   */
  async createSubmission({ assignment_id, student_id, submission_url, submission_text }) {
    const existing = await AssignmentSubmission.findOne({
      assignment_id,
      student_id,
    });

    if (existing) {
      existing.submission_url = submission_url || existing.submission_url;
      existing.submission_text = submission_text || existing.submission_text;
      existing.status = 'submitted';
      existing.submitted_at = new Date();
      const saved = await existing.save();
      return saved.toJSON();
    }

    const submission = new AssignmentSubmission({
      assignment_id,
      student_id,
      submission_url: submission_url || null,
      submission_text: submission_text || null,
      status: 'submitted',
    });

    const saved = await submission.save();
    return saved.toJSON();
  }

  /**
   * Grade a submission
   */
  async gradeSubmission(submissionId, { marks, feedback, status = 'graded', graded_by }) {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return null;
    }

    const updatePayload = {
      marks: Number(marks),
      feedback: feedback || '',
      status,
      graded_at: new Date(),
    };
    if (graded_by) updatePayload.graded_by = graded_by;

    const updated = await AssignmentSubmission.findByIdAndUpdate(
      submissionId,
      { $set: updatePayload },
      { new: true }
    );

    return updated ? updated.toJSON() : null;
  }

  /**
   * Get submissions for an assignment
   */
  async getSubmissionsByAssignment(assignmentId) {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return [];
    }

    const submissions = await AssignmentSubmission.find({ assignment_id: assignmentId })
      .populate('student_id', 'full_name email role avatar_url')
      .sort({ submitted_at: -1 });

    return submissions.map((s) => {
      const sJson = s.toJSON();
      return {
        ...sJson,
        profiles: sJson.student_id, // Map for compatibility with existing UI
      };
    });
  }

  /**
   * Get submissions by student for multiple assignments
   */
  async getSubmissionsByStudent(studentId, assignmentIds = []) {
    const query = { student_id: studentId };
    if (assignmentIds.length > 0) {
      query.assignment_id = { $in: assignmentIds };
    }

    const submissions = await AssignmentSubmission.find(query);
    return submissions.map((s) => s.toJSON());
  }

  /**
   * Get pending assignments for a student
   */
  async getPendingAssignments(studentId, courseIds = []) {
    if (courseIds.length === 0) return [];

    // Find all assignments in enrolled courses
    const assignments = await Assignment.find({
      course_id: { $in: courseIds },
    })
      .populate('course_id', 'course_name course_code')
      .sort({ due_date: 1 });

    // Find all submissions already completed by this student
    const submitted = await AssignmentSubmission.find({
      student_id: studentId,
      assignment_id: { $in: assignments.map((a) => a._id) },
    });

    const submittedSet = new Set(submitted.map((s) => s.assignment_id.toString()));

    const pending = assignments
      .filter((a) => !submittedSet.has(a._id.toString()))
      .map((a) => {
        const aJson = a.toJSON();
        return {
          ...aJson,
          courses: aJson.course_id,
        };
      });

    return pending;
  }
}

module.exports = new AssignmentDAO();
