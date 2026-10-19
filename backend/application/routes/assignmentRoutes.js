const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { handlePdfUpload } = require('../middleware/uploadMiddleware');

// Public/authenticated file retrieval route for locally stored PDFs
router.get('/files/:filename', (req, res) => assignmentController.serveFile(req, res));

// All remaining assignment routes require authentication
router.use(authenticate);

// POST /assignments – Create assignment with optional PDF upload (instructor/admin)
router.post(
  '/',
  authorize('instructor', 'admin'),
  handlePdfUpload(),
  (req, res) => assignmentController.createAssignment(req, res)
);

// GET /assignments/course/:courseId – Get assignments for a course
router.get('/course/:courseId', (req, res) => assignmentController.getAssignmentsByCourse(req, res));

// GET /assignments/pending/me – Pending assignments for student
router.get('/pending/me', (req, res) => assignmentController.getPendingAssignments(req, res));

// GET /assignments/:assignmentId – View single assignment details
router.get('/:assignmentId', (req, res) => assignmentController.getAssignmentById(req, res));

// PUT /assignments/:assignmentId – Update assignment with optional PDF upload (instructor/admin)
router.put(
  '/:assignmentId',
  authorize('instructor', 'admin'),
  handlePdfUpload(),
  (req, res) => assignmentController.updateAssignment(req, res)
);

// DELETE /assignments/:assignmentId – Delete assignment (instructor/admin)
router.delete(
  '/:assignmentId',
  authorize('instructor', 'admin'),
  (req, res) => assignmentController.deleteAssignment(req, res)
);

// Submissions workflows
// GET /assignments/:assignmentId/submissions – View submissions (instructor/admin)
router.get(
  '/:assignmentId/submissions',
  authorize('instructor', 'admin'),
  (req, res) => assignmentController.getSubmissions(req, res)
);

// POST /assignments/:assignmentId/submit – Submit work (student)
router.post(
  '/:assignmentId/submit',
  authorize('student'),
  (req, res) => assignmentController.submitAssignment(req, res)
);

// PUT /assignments/:assignmentId/grade/:submissionId – Grade submission (instructor/admin)
router.put(
  '/:assignmentId/grade/:submissionId',
  authorize('instructor', 'admin'),
  (req, res) => assignmentController.gradeSubmission(req, res)
);

module.exports = router;
