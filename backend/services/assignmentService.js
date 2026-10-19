const assignmentDAO = require('../dao/assignmentDAO');
const courseDAO = require('../dao/courseDAO');
const fileService = require('./fileService');

class AssignmentService {
  /**
   * Create an assignment with optional PDF upload
   */
  async createAssignment({ course_id, title, description, due_date }, file, user) {
    if (!course_id) {
      const error = new Error('Course ID is required');
      error.statusCode = 400;
      throw error;
    }
    if (!title || !title.trim()) {
      const error = new Error('Assignment title is required');
      error.statusCode = 400;
      throw error;
    }

    // Role check: Only instructor or admin can create assignments
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      const error = new Error('Only instructors and administrators can create assignments');
      error.statusCode = 403;
      throw error;
    }

    // If instructor, check assignment to this course
    if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(course_id, user.id);
      if (!isAssigned) {
        const error = new Error('You are not assigned to instruct this course');
        error.statusCode = 403;
        throw error;
      }
    }

    let attachment_path = null;
    let attachment_name = null;

    // Handle PDF upload if attached
    if (file) {
      const uploadResult = await fileService.uploadAssignmentPDF(file, course_id);
      attachment_path = uploadResult.attachment_path;
      attachment_name = uploadResult.attachment_name;
    }

    const assignment = await assignmentDAO.createAssignment({
      course_id,
      title: title.trim(),
      description: description ? description.trim() : '',
      due_date: due_date || null,
      created_by: user.id,
      attachment_path,
      attachment_name,
    });

    if (attachment_path) {
      assignment.attachment_url = await fileService.getAttachmentUrl(attachment_path);
    }

    return assignment;
  }

  /**
   * Get assignments for a course with access control and attachment URLs
   */
  async getAssignmentsByCourse(courseId, user) {
    if (!courseId) {
      const error = new Error('Course ID is required');
      error.statusCode = 400;
      throw error;
    }

    // Permission check
    if (user.role === 'student') {
      const isEnrolled = await courseDAO.isStudentEnrolled(courseId, user.id);
      if (!isEnrolled) {
        const error = new Error('You are not enrolled in this course');
        error.statusCode = 403;
        throw error;
      }
    } else if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(courseId, user.id);
      if (!isAssigned) {
        const error = new Error('You are not assigned to this course');
        error.statusCode = 403;
        throw error;
      }
    }

    const assignments = await assignmentDAO.getAssignmentsByCourse(courseId);

    // Enrich with download URLs
    const enriched = await Promise.all(
      assignments.map(async (a) => {
        let attachment_url = null;
        if (a.attachment_path) {
          attachment_url = await fileService.getAttachmentUrl(a.attachment_path);
        }
        return {
          ...a,
          attachment_url,
        };
      })
    );

    // If student, attach student's submission info
    if (user.role === 'student') {
      const assignmentIds = enriched.map(a => a.id);
      const submissions = await assignmentDAO.getSubmissionsByStudent(user.id, assignmentIds);
      const subMap = {};
      submissions.forEach(s => { subMap[s.assignment_id] = s; });

      return enriched.map(a => ({
        ...a,
        mySubmission: subMap[a.id] || null,
      }));
    }

    return enriched;
  }

  /**
   * Get single assignment by ID
   */
  async getAssignmentById(assignmentId, user) {
    if (!assignmentId) {
      const error = new Error('Assignment ID is required');
      error.statusCode = 400;
      throw error;
    }

    const assignment = await assignmentDAO.getAssignmentById(assignmentId);
    if (!assignment) {
      const error = new Error('Assignment not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify course access
    if (user.role === 'student') {
      const isEnrolled = await courseDAO.isStudentEnrolled(assignment.course_id, user.id);
      if (!isEnrolled) {
        const error = new Error('Access denied: You are not enrolled in this course');
        error.statusCode = 403;
        throw error;
      }
    } else if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(assignment.course_id, user.id);
      if (!isAssigned) {
        const error = new Error('Access denied: You are not assigned to this course');
        error.statusCode = 403;
        throw error;
      }
    }

    let attachment_url = null;
    if (assignment.attachment_path) {
      attachment_url = await fileService.getAttachmentUrl(assignment.attachment_path);
    }

    return {
      ...assignment,
      attachment_url,
    };
  }

  /**
   * Update assignment details and/or replace PDF
   */
  async updateAssignment(assignmentId, updateData, file, user) {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      const error = new Error('Only instructors and administrators can update assignments');
      error.statusCode = 403;
      throw error;
    }

    const existing = await assignmentDAO.getAssignmentById(assignmentId);
    if (!existing) {
      const error = new Error('Assignment not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(existing.course_id, user.id);
      if (!isAssigned) {
        const error = new Error('You are not assigned to this course');
        error.statusCode = 403;
        throw error;
      }
    }

    const payload = {};
    if (updateData.title !== undefined) payload.title = updateData.title.trim();
    if (updateData.description !== undefined) payload.description = updateData.description.trim();
    if (updateData.due_date !== undefined) payload.due_date = updateData.due_date;
    if (updateData.course_id !== undefined) payload.course_id = updateData.course_id;

    // Handle PDF replacement or removal
    if (file) {
      // If there was an existing attachment, remove the old file
      if (existing.attachment_path) {
        await fileService.deleteAttachment(existing.attachment_path);
      }
      const uploadResult = await fileService.uploadAssignmentPDF(file, existing.course_id);
      payload.attachment_path = uploadResult.attachment_path;
      payload.attachment_name = uploadResult.attachment_name;
    } else if (updateData.remove_attachment === true || updateData.remove_attachment === 'true') {
      if (existing.attachment_path) {
        await fileService.deleteAttachment(existing.attachment_path);
      }
      payload.attachment_path = null;
      payload.attachment_name = null;
    }

    const updated = await assignmentDAO.updateAssignment(assignmentId, payload);

    if (updated?.attachment_path) {
      updated.attachment_url = await fileService.getAttachmentUrl(updated.attachment_path);
    }

    return updated;
  }

  /**
   * Delete assignment and remove associated storage file
   */
  async deleteAssignment(assignmentId, user) {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      const error = new Error('Only instructors and administrators can delete assignments');
      error.statusCode = 403;
      throw error;
    }

    const existing = await assignmentDAO.getAssignmentById(assignmentId);
    if (!existing) {
      const error = new Error('Assignment not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(existing.course_id, user.id);
      if (!isAssigned) {
        const error = new Error('You are not assigned to this course');
        error.statusCode = 403;
        throw error;
      }
    }

    // Safely delete associated PDF file if it exists
    if (existing.attachment_path) {
      try {
        await fileService.deleteAttachment(existing.attachment_path);
      } catch (err) {
        console.warn('Failed to delete attachment file from storage:', err.message);
      }
    }

    const success = await assignmentDAO.deleteAssignment(assignmentId);
    return { success, message: 'Assignment and attached files deleted successfully' };
  }

  /**
   * Get submissions for an assignment (instructor/admin)
   */
  async getAssignmentSubmissions(assignmentId, user) {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      const error = new Error('Only instructors and administrators can view all submissions');
      error.statusCode = 403;
      throw error;
    }

    return assignmentDAO.getSubmissionsByAssignment(assignmentId);
  }

  /**
   * Submit an assignment (student)
   */
  async submitAssignment(assignmentId, { submission_url, submission_text }, user) {
    if (!user || user.role !== 'student') {
      const error = new Error('Only students can submit assignments');
      error.statusCode = 403;
      throw error;
    }

    const assignment = await assignmentDAO.getAssignmentById(assignmentId);
    if (!assignment) {
      const error = new Error('Assignment not found');
      error.statusCode = 404;
      throw error;
    }

    const isEnrolled = await courseDAO.isStudentEnrolled(assignment.course_id, user.id);
    if (!isEnrolled) {
      const error = new Error('You are not enrolled in this course');
      error.statusCode = 403;
      throw error;
    }

    return assignmentDAO.createSubmission({
      assignment_id: assignmentId,
      student_id: user.id,
      submission_url,
      submission_text,
    });
  }

  /**
   * Grade a submission (instructor/admin)
   */
  async gradeSubmission(submissionId, { marks, feedback }, user) {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      const error = new Error('Only instructors and administrators can grade submissions');
      error.statusCode = 403;
      throw error;
    }

    return assignmentDAO.gradeSubmission(submissionId, { marks, feedback, status: 'graded' });
  }

  /**
   * Get pending assignments for a student
   */
  async getPendingAssignments(user) {
    if (!user || user.role !== 'student') {
      return [];
    }

    const enrolledCourses = await courseDAO.getCoursesByStudent(user.id);
    const courseIds = enrolledCourses.map(c => c.id);
    return assignmentDAO.getPendingAssignments(user.id, courseIds);
  }
}

module.exports = new AssignmentService();
