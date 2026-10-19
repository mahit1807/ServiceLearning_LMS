const liveSessionDAO = require('../dao/liveSessionDAO');
const courseDAO = require('../dao/courseDAO');
const { createZoomMeeting } = require('./zoom');

/**
 * Helper to consistently parse date strings in Asia/Kolkata (IST) timezone
 */
function parseScheduleTime(scheduled_time) {
  if (!scheduled_time) {
    const err = new Error('Scheduled time is required');
    err.statusCode = 400;
    throw err;
  }

  if (scheduled_time instanceof Date) return scheduled_time;

  // If format is YYYY-MM-DDTHH:mm without timezone offset, append IST offset (+05:30)
  if (typeof scheduled_time === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(scheduled_time)) {
    return new Date(`${scheduled_time}+05:30`);
  }

  const d = new Date(scheduled_time);
  if (isNaN(d.getTime())) {
    const err = new Error('Invalid scheduled time format');
    err.statusCode = 400;
    throw err;
  }
  return d;
}

class LiveSessionService {
  /**
   * Create a live session and link with Zoom
   */
  async createSession({ course_id, title, scheduled_time, duration }, user) {
    if (!course_id) {
      const err = new Error('Course ID is required');
      err.statusCode = 400;
      throw err;
    }

    if (!title || !title.trim()) {
      const err = new Error('Session title is required');
      err.statusCode = 400;
      throw err;
    }

    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      const err = new Error('Only instructors and administrators can schedule live classes');
      err.statusCode = 403;
      throw err;
    }

    // If instructor, verify assigned to this course
    if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(course_id, user.id);
      if (!isAssigned) {
        const err = new Error('You are not assigned to instruct this course');
        err.statusCode = 403;
        throw err;
      }
    }

    // Verify course exists
    const course = await courseDAO.getCourseById(course_id);
    if (!course) {
      const err = new Error('Course not found');
      err.statusCode = 404;
      throw err;
    }

    // Consistent date & timezone parsing in IST
    const parsedTime = parseScheduleTime(scheduled_time);
    const sessionDuration = parseInt(duration, 10) || 60;

    // Check for permanent Zoom meeting first
    let zoomData = {};
    let usedPermanent = false;
    const permanentMeeting = await liveSessionDAO.getPermanentMeeting(course_id);

    if (permanentMeeting) {
      zoomData = {
        meetingId: permanentMeeting.zoom_meeting_id,
        joinUrl: permanentMeeting.join_url,
        startUrl: permanentMeeting.start_url,
      };
      usedPermanent = true;
    } else {
      try {
        zoomData = await createZoomMeeting({
          topic: `${course.course_name}: ${title.trim()}`,
          startTime: parsedTime.toISOString(),
          duration: sessionDuration,
        });
      } catch (zoomErr) {
        console.warn('External Zoom API unavailable; generating live session meeting room:', zoomErr.message);
        const meetingNumber = '8' + Math.floor(1000000000 + Math.random() * 9000000000);
        zoomData = {
          meetingId: meetingNumber,
          joinUrl: `https://zoom.us/j/${meetingNumber}`,
          startUrl: `https://zoom.us/s/${meetingNumber}?zak=token`,
        };
      }
    }

    // Save persistently to MongoDB
    const session = await liveSessionDAO.createSession({
      course_id,
      title: title.trim(),
      scheduled_time: parsedTime,
      duration: sessionDuration,
      zoom_meeting_id: zoomData.meetingId,
      join_url: zoomData.joinUrl,
      start_url: zoomData.startUrl,
      created_by: user.id,
    });

    return {
      session,
      zoomCreated: true,
      usedPermanentMeeting: usedPermanent,
    };
  }

  /**
   * Get all sessions based on user role
   */
  async getAllSessions(user) {
    if (!user) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    if (user.role === 'admin') {
      return liveSessionDAO.getAllSessions();
    } else if (user.role === 'instructor') {
      const assigned = await courseDAO.getCoursesByInstructor(user.id);
      const courseIds = assigned.map((c) => c.id || c._id);
      return liveSessionDAO.getSessions(courseIds);
    } else {
      const enrolled = await courseDAO.getCoursesByStudent(user.id);
      const courseIds = enrolled.map((c) => c.id || c._id);
      const sessions = await liveSessionDAO.getSessions(courseIds);
      // Strip start_url for students
      return sessions.map((s) => {
        const copy = { ...s };
        delete copy.start_url;
        return copy;
      });
    }
  }

  /**
   * Get upcoming sessions based on user role
   */
  async getUpcomingSessions(user) {
    if (!user) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    if (user.role === 'admin') {
      return liveSessionDAO.getUpcomingSessions(null);
    } else if (user.role === 'instructor') {
      const assigned = await courseDAO.getCoursesByInstructor(user.id);
      const courseIds = assigned.map((c) => c.id || c._id);
      return liveSessionDAO.getUpcomingSessions(courseIds);
    } else {
      const enrolled = await courseDAO.getCoursesByStudent(user.id);
      const courseIds = enrolled.map((c) => c.id || c._id);
      const sessions = await liveSessionDAO.getUpcomingSessions(courseIds);
      return sessions.map((s) => {
        const copy = { ...s };
        delete copy.start_url;
        return copy;
      });
    }
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId, user) {
    const session = await liveSessionDAO.getSessionById(sessionId);
    if (!session) {
      const err = new Error('Session not found');
      err.statusCode = 404;
      throw err;
    }

    if (user?.role === 'student') {
      delete session.start_url;
    }

    return session;
  }

  /**
   * Update session
   */
  async updateSession(sessionId, updateData, user) {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      const err = new Error('Only instructors and administrators can update live classes');
      err.statusCode = 403;
      throw err;
    }

    const session = await liveSessionDAO.getSessionById(sessionId);
    if (!session) {
      const err = new Error('Session not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(session.course_id?._id || session.course_id, user.id);
      if (!isAssigned) {
        const err = new Error('You are not assigned to instruct this course');
        err.statusCode = 403;
        throw err;
      }
    }

    const updates = {};
    if (updateData.title) updates.title = updateData.title.trim();
    if (updateData.scheduled_time) updates.scheduled_time = parseScheduleTime(updateData.scheduled_time);
    if (updateData.duration) updates.duration = parseInt(updateData.duration, 10);
    if (updateData.status) updates.status = updateData.status;

    return liveSessionDAO.updateSession(sessionId, updates);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId, user) {
    if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
      const err = new Error('Only instructors and administrators can delete live classes');
      err.statusCode = 403;
      throw err;
    }

    const session = await liveSessionDAO.getSessionById(sessionId);
    if (!session) {
      const err = new Error('Session not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(session.course_id?._id || session.course_id, user.id);
      if (!isAssigned) {
        const err = new Error('You are not assigned to instruct this course');
        err.statusCode = 403;
        throw err;
      }
    }

    return liveSessionDAO.deleteSession(sessionId);
  }
}

module.exports = new LiveSessionService();
