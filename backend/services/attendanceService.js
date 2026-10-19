const attendanceDAO = require('../dao/attendanceDAO');
const liveSessionDAO = require('../dao/liveSessionDAO');
const courseDAO = require('../dao/courseDAO');
const { LiveSession, User } = require('../models');
const { getMeetingParticipants, getMeetingRecordings } = require('./zoom');

class AttendanceService {
  /**
   * Sync participant attendance & recording from Zoom
   */
  async syncAttendance(sessionId, user) {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      const err = new Error('Only instructors and administrators can sync attendance');
      err.statusCode = 403;
      throw err;
    }

    const session = await LiveSession.findById(sessionId);
    if (!session) {
      const err = new Error('Live session not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(session.course_id, user.id);
      if (!isAssigned) {
        const err = new Error('You are not assigned to instruct this course');
        err.statusCode = 403;
        throw err;
      }
    }

    let zoomParticipants = [];
    let zoomError = null;

    if (session.zoom_meeting_id) {
      try {
        zoomParticipants = await getMeetingParticipants(session.zoom_meeting_id);
      } catch (zErr) {
        zoomError = zErr.message;
        console.warn('Zoom API participant report check:', zErr.message);
      }
    }

    // Save actual participant records
    const attendanceRecords = [];
    for (const p of zoomParticipants) {
      const email = p.user_email || p.email;
      let studentUser = null;
      if (email) {
        studentUser = await User.findOne({ email: email.toLowerCase().trim() });
      }

      const record = await attendanceDAO.upsertAttendanceRecord({
        live_session_id: sessionId,
        student_id: studentUser ? studentUser._id : null,
        participant_name: p.name || 'Participant',
        user_email: email,
        join_time: p.join_time,
        leave_time: p.leave_time,
        duration: Math.round((p.duration || 0) / 60) || p.duration || 0,
        status: (p.duration && p.duration > 15) ? 'PRESENT' : 'PRESENT',
      });
      attendanceRecords.push(record);
    }

    // Check for Zoom cloud recordings and save if found
    let recordingInfo = null;
    if (session.zoom_meeting_id) {
      try {
        const recordings = await getMeetingRecordings(session.zoom_meeting_id);
        if (recordings && recordings.length > 0) {
          const rec = recordings[0];
          session.recording_url = rec.download_url || rec.play_url;
          session.recording_play_url = rec.play_url;
          session.recording_duration = rec.duration;
          session.status = 'completed';
          await session.save();
          recordingInfo = rec;
        }
      } catch (recErr) {
        console.warn('Could not fetch recordings from Zoom:', recErr.message);
      }
    }

    const currentRecords = await attendanceDAO.getAttendanceBySession(sessionId);

    return {
      message: 'Attendance synced successfully',
      recordsProcessed: attendanceRecords.length,
      attendance: currentRecords,
      recording: recordingInfo,
      zoomError: zoomError ? 'Zoom participant report currently unavailable' : null,
    };
  }

  /**
   * Get attendance for a session
   */
  async getAttendanceBySession(sessionId, user) {
    if (!sessionId) {
      const err = new Error('Session ID is required');
      err.statusCode = 400;
      throw err;
    }

    return attendanceDAO.getAttendanceBySession(sessionId);
  }

  /**
   * Get attendance records for a student
   */
  async getAttendanceByStudent(studentId, user) {
    const targetStudentId = studentId || user.id;

    if (user.role === 'student' && user.id !== targetStudentId) {
      const err = new Error('Access denied: You can only view your own attendance');
      err.statusCode = 403;
      throw err;
    }

    return attendanceDAO.getAttendanceByStudent(targetStudentId);
  }

  /**
   * Get attendance records across all sessions in a course
   */
  async getAttendanceByCourse(courseId, user) {
    if (!courseId) {
      const err = new Error('Course ID is required');
      err.statusCode = 400;
      throw err;
    }

    if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(courseId, user.id);
      if (!isAssigned) {
        const err = new Error('Access denied: You are not assigned to this course');
        err.statusCode = 403;
        throw err;
      }
    } else if (user.role === 'student') {
      const isEnrolled = await courseDAO.isStudentEnrolled(courseId, user.id);
      if (!isEnrolled) {
        const err = new Error('Access denied: You are not enrolled in this course');
        err.statusCode = 403;
        throw err;
      }
    }

    return attendanceDAO.getAttendanceByCourse(courseId);
  }

  /**
   * Manually update attendance record
   */
  async updateAttendance(recordId, updateData, user) {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      const err = new Error('Only instructors and administrators can update attendance');
      err.statusCode = 403;
      throw err;
    }

    const updates = {};
    if (updateData.status) updates.status = updateData.status;
    if (updateData.duration !== undefined) updates.duration = updateData.duration;

    const updated = await attendanceDAO.updateAttendance(recordId, updates);
    if (!updated) {
      const err = new Error('Attendance record not found');
      err.statusCode = 404;
      throw err;
    }
    return updated;
  }
}

module.exports = new AttendanceService();
