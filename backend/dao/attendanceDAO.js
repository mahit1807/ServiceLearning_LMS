const mongoose = require('mongoose');
const {
  SessionAttendance,
  LectureSummary,
  User,
  LiveSession,
} = require('../models');

class AttendanceDAO {
  /**
   * Upsert an attendance record by live_session_id and user_email
   */
  async upsertAttendanceRecord({
    live_session_id,
    student_id,
    participant_name,
    user_email,
    join_time,
    leave_time,
    duration,
    status = 'PRESENT',
  }) {
    const emailKey = (user_email || '').toLowerCase().trim();

    // Try finding matching student user if student_id not provided
    let matchedStudentId = student_id;
    if (!matchedStudentId && emailKey) {
      const user = await User.findOne({ email: emailKey });
      if (user) {
        matchedStudentId = user._id;
      }
    }

    const filter = {
      live_session_id,
      user_email: emailKey,
    };

    const update = {
      participant_name: participant_name || 'Participant',
      user_email: emailKey,
      join_time: join_time ? new Date(join_time) : null,
      leave_time: leave_time ? new Date(leave_time) : null,
      duration: duration || 0,
      status,
    };

    if (matchedStudentId) {
      update.student_id = matchedStudentId;
    }

    const record = await SessionAttendance.findOneAndUpdate(
      filter,
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return record.toJSON();
  }

  /**
   * Get attendance records for a live session
   */
  async getAttendanceBySession(liveSessionId) {
    if (!mongoose.Types.ObjectId.isValid(liveSessionId)) return [];

    const records = await SessionAttendance.find({ live_session_id: liveSessionId })
      .populate('student_id', 'full_name email role avatar_url')
      .populate('live_session_id', 'title scheduled_time duration')
      .sort({ participant_name: 1 });

    return records.map((r) => {
      const rJson = r.toJSON();
      return {
        ...rJson,
        profiles: rJson.student_id || {
          full_name: rJson.participant_name,
          email: rJson.user_email,
        },
        live_sessions: rJson.live_session_id,
      };
    });
  }

  /**
   * Get attendance records for a student
   */
  async getAttendanceByStudent(studentId) {
    if (!mongoose.Types.ObjectId.isValid(studentId)) return [];

    const records = await SessionAttendance.find({ student_id: studentId })
      .populate({
        path: 'live_session_id',
        populate: { path: 'course_id', select: 'course_name course_code' },
      })
      .sort({ created_at: -1 });

    return records.map((r) => {
      const rJson = r.toJSON();
      return {
        ...rJson,
        live_sessions: rJson.live_session_id,
      };
    });
  }

  /**
   * Get attendance records across all sessions for a course
   */
  async getAttendanceByCourse(courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) return [];

    const sessions = await LiveSession.find({ course_id: courseId });
    if (!sessions || sessions.length === 0) return [];

    const sessionIds = sessions.map((s) => s._id);

    const records = await SessionAttendance.find({ live_session_id: { $in: sessionIds } })
      .populate('student_id', 'full_name email role avatar_url')
      .populate({
        path: 'live_session_id',
        select: 'title scheduled_time duration course_id',
      })
      .sort({ created_at: -1 });

    return records.map((r) => {
      const rJson = r.toJSON();
      return {
        ...rJson,
        profiles: rJson.student_id || {
          full_name: rJson.participant_name,
          email: rJson.user_email,
        },
        live_sessions: rJson.live_session_id,
      };
    });
  }

  /**
   * Update attendance status manually
   */
  async updateAttendance(recordId, updateData) {
    if (!mongoose.Types.ObjectId.isValid(recordId)) return null;
    const updated = await SessionAttendance.findByIdAndUpdate(
      recordId,
      { $set: updateData },
      { new: true }
    );
    return updated ? updated.toJSON() : null;
  }

  /**
   * Save lecture summary
   */
  async saveSessionSummary({ live_session_id, course_id, summary_text, key_points = [] }) {
    const summary = await LectureSummary.findOneAndUpdate(
      { live_session_id },
      {
        $set: {
          course_id,
          summary_text,
          key_points,
          generated_at: new Date(),
        },
      },
      { upsert: true, new: true }
    );
    return summary.toJSON();
  }

  /**
   * Get lecture summary for session
   */
  async getSessionSummary(liveSessionId) {
    if (!mongoose.Types.ObjectId.isValid(liveSessionId)) return null;
    const summary = await LectureSummary.findOne({ live_session_id: liveSessionId });
    return summary ? summary.toJSON() : null;
  }
}

module.exports = new AttendanceDAO();
