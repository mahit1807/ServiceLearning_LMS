const mongoose = require('mongoose');
const {
  LiveSession,
  CourseZoomMeeting,
  SessionAttendance,
  LectureSummary,
} = require('../models');

class LiveSessionDAO {
  /**
   * Create a live session
   */
  async createSession({
    course_id,
    title,
    scheduled_time,
    duration = 60,
    zoom_meeting_id,
    join_url,
    start_url,
    created_by,
  }) {
    const session = new LiveSession({
      course_id,
      title: title.trim(),
      scheduled_time: new Date(scheduled_time),
      duration: Number(duration) || 60,
      status: 'scheduled',
      zoom_meeting_id: zoom_meeting_id || null,
      join_url: join_url || null,
      start_url: start_url || null,
      created_by: created_by || null,
    });

    const saved = await session.save();
    await saved.populate('course_id', 'course_name course_code');
    const sJson = saved.toJSON();
    return {
      ...sJson,
      courses: sJson.course_id,
    };
  }

  /**
   * Get single session by ID
   */
  async getSessionById(sessionId) {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return null;
    const session = await LiveSession.findById(sessionId).populate('course_id', 'course_name course_code');
    if (!session) return null;
    const sJson = session.toJSON();
    return {
      ...sJson,
      courses: sJson.course_id,
    };
  }

  /**
   * Get all live sessions (for admin or global list)
   */
  async getAllSessions() {
    const sessions = await LiveSession.find()
      .populate('course_id', 'course_name course_code')
      .sort({ scheduled_time: -1 });

    return sessions.map((s) => {
      const sJson = s.toJSON();
      return {
        ...sJson,
        courses: sJson.course_id,
      };
    });
  }

  /**
   * Get upcoming sessions for given courseIds or all if null
   */
  async getUpcomingSessions(courseIds = null) {
    const now = new Date();
    // Return sessions that are scheduled or ongoing
    const query = {
      $or: [
        { scheduled_time: { $gte: now }, status: { $ne: 'cancelled' } },
        { status: { $in: ['scheduled', 'ongoing'] } },
      ],
    };

    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
      query.course_id = { $in: courseIds };
    }

    const sessions = await LiveSession.find(query)
      .populate('course_id', 'course_name course_code')
      .sort({ scheduled_time: 1 });

    return sessions.map((s) => {
      const sJson = s.toJSON();
      return {
        ...sJson,
        courses: sJson.course_id,
      };
    });
  }

  /**
   * Get all sessions for courses
   */
  async getSessions(courseIds = null) {
    const query = {};
    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
      query.course_id = { $in: courseIds };
    }

    const sessions = await LiveSession.find(query)
      .populate('course_id', 'course_name course_code')
      .sort({ scheduled_time: -1 });

    return sessions.map((s) => {
      const sJson = s.toJSON();
      return {
        ...sJson,
        courses: sJson.course_id,
      };
    });
  }

  /**
   * Update session
   */
  async updateSession(sessionId, updateData) {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return null;
    const updated = await LiveSession.findByIdAndUpdate(
      sessionId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('course_id', 'course_name course_code');
    if (!updated) return null;
    const sJson = updated.toJSON();
    return {
      ...sJson,
      courses: sJson.course_id,
    };
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return false;
    await Promise.allSettled([
      SessionAttendance.deleteMany({ live_session_id: sessionId }),
      LectureSummary.deleteMany({ live_session_id: sessionId }),
    ]);
    const result = await LiveSession.findByIdAndDelete(sessionId);
    return !!result;
  }

  /**
   * Get permanent Zoom meeting for a course
   */
  async getPermanentMeeting(courseId) {
    if (!mongoose.Types.ObjectId.isValid(courseId)) return null;
    const meeting = await CourseZoomMeeting.findOne({ course_id: courseId });
    return meeting ? meeting.toJSON() : null;
  }

  /**
   * Set permanent Zoom meeting for a course
   */
  async setPermanentMeeting(courseId, { zoom_meeting_id, join_url, start_url, passcode }) {
    const updated = await CourseZoomMeeting.findOneAndUpdate(
      { course_id: courseId },
      {
        $set: {
          zoom_meeting_id,
          join_url,
          start_url: start_url || null,
          passcode: passcode || null,
        },
      },
      { upsert: true, new: true }
    );
    return updated.toJSON();
  }
}

module.exports = new LiveSessionDAO();
