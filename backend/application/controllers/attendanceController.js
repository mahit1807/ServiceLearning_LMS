const attendanceService = require('../../services/attendanceService');

class AttendanceController {
  /**
   * POST /attendance/fetch/:liveSessionId – Sync attendance & recording from Zoom
   */
  async syncAttendance(req, res) {
    try {
      const { liveSessionId } = req.params;
      const result = await attendanceService.syncAttendance(liveSessionId, req.user);
      return res.status(200).json(result);
    } catch (err) {
      console.error('AttendanceController.syncAttendance error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to sync attendance',
      });
    }
  }

  /**
   * GET /attendance/session/:liveSessionId – Attendance for a specific session
   */
  async getAttendanceBySession(req, res) {
    try {
      const { liveSessionId } = req.params;
      const attendance = await attendanceService.getAttendanceBySession(liveSessionId, req.user);
      return res.status(200).json({ attendance });
    } catch (err) {
      console.error('AttendanceController.getAttendanceBySession error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch session attendance',
      });
    }
  }

  /**
   * GET /attendance/student/:studentId – Attendance for a specific student
   */
  async getAttendanceByStudent(req, res) {
    try {
      const { studentId } = req.params;
      const attendance = await attendanceService.getAttendanceByStudent(studentId, req.user);
      return res.status(200).json({ attendance });
    } catch (err) {
      console.error('AttendanceController.getAttendanceByStudent error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch student attendance',
      });
    }
  }

  /**
   * GET /attendance/my-attendance – Current user's attendance
   */
  async getMyAttendance(req, res) {
    try {
      const attendance = await attendanceService.getAttendanceByStudent(req.user.id, req.user);
      return res.status(200).json({ attendance });
    } catch (err) {
      console.error('AttendanceController.getMyAttendance error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch personal attendance',
      });
    }
  }

  /**
   * GET /attendance/course/:courseId – Attendance across all sessions in a course
   */
  async getAttendanceByCourse(req, res) {
    try {
      const { courseId } = req.params;
      const attendance = await attendanceService.getAttendanceByCourse(courseId, req.user);
      return res.status(200).json({ attendance });
    } catch (err) {
      console.error('AttendanceController.getAttendanceByCourse error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch course attendance',
      });
    }
  }

  /**
   * PUT /attendance/:recordId – Manually update attendance record
   */
  async updateAttendance(req, res) {
    try {
      const { recordId } = req.params;
      const updated = await attendanceService.updateAttendance(recordId, req.body, req.user);
      return res.status(200).json({
        message: 'Attendance record updated successfully',
        record: updated,
      });
    } catch (err) {
      console.error('AttendanceController.updateAttendance error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to update attendance',
      });
    }
  }
}

module.exports = new AttendanceController();
