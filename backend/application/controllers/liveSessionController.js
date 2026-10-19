const liveSessionService = require('../../services/liveSessionService');

class LiveSessionController {
  /**
   * POST /live-sessions/create – Schedule a live class
   */
  async createSession(req, res) {
    try {
      const { course_id, title, scheduled_time, duration } = req.body;
      const result = await liveSessionService.createSession(
        { course_id, title, scheduled_time, duration },
        req.user
      );

      return res.status(201).json({
        message: 'Zoom Live Session scheduled successfully!',
        ...result,
      });
    } catch (err) {
      console.error('LiveSessionController.createSession error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to create live session',
      });
    }
  }

  /**
   * GET /live-sessions/all – List all live sessions
   */
  async getAllSessions(req, res) {
    try {
      const sessions = await liveSessionService.getAllSessions(req.user);
      return res.status(200).json({ sessions });
    } catch (err) {
      console.error('LiveSessionController.getAllSessions error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch live sessions',
      });
    }
  }

  /**
   * GET /live-sessions/upcoming – List upcoming live sessions
   */
  async getUpcomingSessions(req, res) {
    try {
      const sessions = await liveSessionService.getUpcomingSessions(req.user);
      return res.status(200).json({ sessions });
    } catch (err) {
      console.error('LiveSessionController.getUpcomingSessions error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch upcoming sessions',
      });
    }
  }

  /**
   * GET /live-sessions/:sessionId – Get session details
   */
  async getSessionById(req, res) {
    try {
      const { sessionId } = req.params;
      const session = await liveSessionService.getSessionById(sessionId, req.user);
      return res.status(200).json({ session });
    } catch (err) {
      console.error('LiveSessionController.getSessionById error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to fetch session',
      });
    }
  }

  /**
   * PUT /live-sessions/:sessionId – Update live session
   */
  async updateSession(req, res) {
    try {
      const { sessionId } = req.params;
      const updated = await liveSessionService.updateSession(sessionId, req.body, req.user);
      return res.status(200).json({
        message: 'Live session updated successfully',
        session: updated,
      });
    } catch (err) {
      console.error('LiveSessionController.updateSession error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to update session',
      });
    }
  }

  /**
   * DELETE /live-sessions/:sessionId – Delete live session
   */
  async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      await liveSessionService.deleteSession(sessionId, req.user);
      return res.status(200).json({
        message: 'Session deleted successfully',
      });
    } catch (err) {
      console.error('LiveSessionController.deleteSession error:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({
        error: err.message || 'Failed to delete session',
      });
    }
  }
}

module.exports = new LiveSessionController();
