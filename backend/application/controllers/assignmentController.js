const assignmentService = require('../../services/assignmentService');
const fileService = require('../../services/fileService');

class AssignmentController {
  /**
   * POST /assignments – Create assignment (multipart form data or JSON)
   */
  async createAssignment(req, res) {
    try {
      const { course_id, title, description, due_date } = req.body;
      const file = req.file;

      if (!course_id) {
        return res.status(400).json({ error: 'Course ID is required' });
      }
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Assignment title is required' });
      }

      const assignment = await assignmentService.createAssignment(
        { course_id, title, description, due_date },
        file,
        req.user
      );

      return res.status(201).json({
        message: 'Assignment created successfully',
        assignment,
      });
    } catch (err) {
      console.error('AssignmentController.createAssignment error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to create assignment',
      });
    }
  }

  /**
   * GET /assignments/course/:courseId – Get assignments for a course
   */
  async getAssignmentsByCourse(req, res) {
    try {
      const { courseId } = req.params;
      const assignments = await assignmentService.getAssignmentsByCourse(courseId, req.user);
      return res.status(200).json({ assignments });
    } catch (err) {
      console.error('AssignmentController.getAssignmentsByCourse error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch assignments',
      });
    }
  }

  /**
   * GET /assignments/:assignmentId – Get single assignment
   */
  async getAssignmentById(req, res) {
    try {
      const { assignmentId } = req.params;
      const assignment = await assignmentService.getAssignmentById(assignmentId, req.user);
      return res.status(200).json({ assignment });
    } catch (err) {
      console.error('AssignmentController.getAssignmentById error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch assignment details',
      });
    }
  }

  /**
   * PUT /assignments/:assignmentId – Update assignment (with optional new PDF)
   */
  async updateAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const { title, description, due_date, course_id, remove_attachment } = req.body;
      const file = req.file;

      const updated = await assignmentService.updateAssignment(
        assignmentId,
        { title, description, due_date, course_id, remove_attachment },
        file,
        req.user
      );

      return res.status(200).json({
        message: 'Assignment updated successfully',
        assignment: updated,
      });
    } catch (err) {
      console.error('AssignmentController.updateAssignment error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to update assignment',
      });
    }
  }

  /**
   * DELETE /assignments/:assignmentId – Delete assignment
   */
  async deleteAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const result = await assignmentService.deleteAssignment(assignmentId, req.user);
      return res.status(200).json(result);
    } catch (err) {
      console.error('AssignmentController.deleteAssignment error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to delete assignment',
      });
    }
  }

  /**
   * GET /assignments/:assignmentId/submissions – View submissions (instructor/admin)
   */
  async getSubmissions(req, res) {
    try {
      const { assignmentId } = req.params;
      const submissions = await assignmentService.getAssignmentSubmissions(assignmentId, req.user);
      return res.status(200).json({ submissions });
    } catch (err) {
      console.error('AssignmentController.getSubmissions error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch submissions',
      });
    }
  }

  /**
   * POST /assignments/:assignmentId/submit – Submit assignment (student)
   */
  async submitAssignment(req, res) {
    try {
      const { assignmentId } = req.params;
      const { submission_url, submission_text } = req.body;

      if (!submission_url && !submission_text) {
        return res.status(400).json({ error: 'Either submission text or a URL is required' });
      }

      const submission = await assignmentService.submitAssignment(
        assignmentId,
        { submission_url, submission_text },
        req.user
      );

      return res.status(201).json({
        message: 'Assignment submitted successfully',
        submission,
      });
    } catch (err) {
      console.error('AssignmentController.submitAssignment error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to submit assignment',
      });
    }
  }

  /**
   * PUT /assignments/:assignmentId/grade/:submissionId – Grade submission (instructor/admin)
   */
  async gradeSubmission(req, res) {
    try {
      const { submissionId } = req.params;
      const { marks, feedback } = req.body;

      const graded = await assignmentService.gradeSubmission(
        submissionId,
        { marks, feedback },
        req.user
      );

      return res.status(200).json({
        message: 'Submission graded successfully',
        submission: graded,
      });
    } catch (err) {
      console.error('AssignmentController.gradeSubmission error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to grade submission',
      });
    }
  }

  /**
   * GET /assignments/pending/me – Pending assignments for current student
   */
  async getPendingAssignments(req, res) {
    try {
      const assignments = await assignmentService.getPendingAssignments(req.user);
      return res.status(200).json({ assignments });
    } catch (err) {
      console.error('AssignmentController.getPendingAssignments error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch pending assignments',
      });
    }
  }

  /**
   * GET /assignments/files/:filename – Download or view locally stored PDF file
   */
  async serveFile(req, res) {
    try {
      const { filename } = req.params;
      const filePath = fileService.getLocalFilePath(filename);

      if (!filePath) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      return res.sendFile(filePath);
    } catch (err) {
      console.error('AssignmentController.serveFile error:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve file' });
    }
  }
}

module.exports = new AssignmentController();
