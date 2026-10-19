const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authenticate = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

// All course routes require authentication
router.use(authenticate);

// CRUD operations
// POST /admin/courses – Create course (admin and instructor)
router.post('/', authorize('admin', 'instructor'), (req, res) => courseController.createCourse(req, res));

// GET /admin/courses – List all courses (admin view or instructor view)
router.get('/', (req, res) => {
  if (req.user.role === 'admin') {
    return courseController.getAllCoursesAdmin(req, res);
  }
  return courseController.getCourses(req, res);
});

// GET /admin/courses/:courseId – View single course details
router.get('/:courseId', (req, res) => courseController.getCourseById(req, res));

// PUT /admin/courses/:courseId – Update course (admin and instructor)
router.put('/:courseId', authorize('admin', 'instructor'), (req, res) => courseController.updateCourse(req, res));

// DELETE /admin/courses/:courseId – Delete course (admin and instructor)
router.delete('/:courseId', authorize('admin', 'instructor'), (req, res) => courseController.deleteCourse(req, res));

// Course assignment & enrollment operations
router.post('/assign-instructor', authorize('admin'), (req, res) => courseController.assignInstructor(req, res));
router.post('/enroll-student', authorize('admin'), (req, res) => courseController.enrollStudent(req, res));
router.delete('/unenroll-student', authorize('admin'), (req, res) => courseController.unenrollStudent(req, res));

module.exports = router;
