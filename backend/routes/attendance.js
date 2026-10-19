const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const attendanceController = require('../application/controllers/attendanceController');

router.use(authenticate);

// POST /attendance/fetch/:liveSessionId – Sync attendance & recording from Zoom
router.post('/fetch/:liveSessionId', authorize('instructor', 'admin'), (req, res) =>
  attendanceController.syncAttendance(req, res)
);

// GET /attendance/session/:liveSessionId – View attendance for a session
router.get('/session/:liveSessionId', authorize('instructor', 'admin'), (req, res) =>
  attendanceController.getAttendanceBySession(req, res)
);

// GET /attendance/student/:studentId – Attendance for a specific student
router.get('/student/:studentId', (req, res) =>
  attendanceController.getAttendanceByStudent(req, res)
);

// GET /attendance/my-attendance – Current student's attendance records
router.get('/my-attendance', (req, res) =>
  attendanceController.getMyAttendance(req, res)
);

// GET /attendance/course/:courseId – Attendance for all sessions in a course
router.get('/course/:courseId', (req, res) =>
  attendanceController.getAttendanceByCourse(req, res)
);

// PUT /attendance/:recordId – Manually update attendance record
router.put('/:recordId', authorize('instructor', 'admin'), (req, res) =>
  attendanceController.updateAttendance(req, res)
);

module.exports = router;
