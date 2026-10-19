const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const liveSessionController = require('../application/controllers/liveSessionController');
const attendanceDAO = require('../dao/attendanceDAO');

router.use(authenticate);

// POST /live-sessions/create – Schedule a live session
router.post('/create', authorize('instructor', 'admin'), (req, res) =>
  liveSessionController.createSession(req, res)
);

// GET /live-sessions/all – List all live sessions (admin / full list)
router.get('/all', (req, res) => liveSessionController.getAllSessions(req, res));

// GET /live-sessions/upcoming – List upcoming live sessions
router.get('/upcoming', (req, res) => liveSessionController.getUpcomingSessions(req, res));

// GET /live-sessions – List all live sessions
router.get('/', (req, res) => liveSessionController.getAllSessions(req, res));

// GET /live-sessions/:sessionId/summary – Get session summary
router.get('/:sessionId/summary', async (req, res) => {
  try {
    const summary = await attendanceDAO.getSessionSummary(req.params.sessionId);
    res.json({ summary });
  } catch (err) {
    console.error('Fetch summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET /live-sessions/:sessionId – Get single session details
router.get('/:sessionId', (req, res) => liveSessionController.getSessionById(req, res));

// PUT /live-sessions/:sessionId – Update a live session
router.put('/:sessionId', authorize('instructor', 'admin'), (req, res) =>
  liveSessionController.updateSession(req, res)
);

// DELETE /live-sessions/:sessionId – Delete a live session
router.delete('/:sessionId', authorize('instructor', 'admin'), (req, res) =>
  liveSessionController.deleteSession(req, res)
);

module.exports = router;
