const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const { LectureSummary, LiveSession } = require('../models');

router.use(authenticate);

function generateSummaryFromTranscript(transcriptText, sessionTitle) {
  const lines = transcriptText.split('\n').map(l => l.trim()).filter(Boolean);
  const sentences = transcriptText.match(/[^.!?]+[.!?]+/g) || [transcriptText];
  const overview = sentences.slice(0, 3).join(' ') || `Transcript overview for ${sessionTitle}.`;
  
  const topics = lines.slice(0, 5).map(l => l.replace(/^[0-9\-\*\•\.\s]+/, '')).filter(l => l.length > 5 && l.length < 80);
  if (topics.length === 0) {
    topics.push(`Key topics discussed in ${sessionTitle}`);
  }

  const keyConcepts = sentences.length > 3 ? sentences.slice(3, 6).join(' ') : overview;
  const takeaways = sentences.slice(-3).map(s => s.trim());
  const shortSummary = sentences.length > 5 ? sentences.slice(0, 7).join(' ') : transcriptText;

  return {
    overview,
    key_topics: topics,
    key_concepts: keyConcepts,
    key_takeaways: takeaways.length > 0 ? takeaways : [overview],
    examples: `Examples mentioned during lecture: ${lines.find(l => l.toLowerCase().includes('example') || l.toLowerCase().includes('like')) || 'Refer to lecture transcript audio.'}`,
    revision_notes: `Revision Notes: ${sentences.slice(1, 4).join(' ')}`,
    review_questions: [
      `What were the central points discussed regarding ${sessionTitle}?`,
      `How are the core concepts in this lecture applied?`,
      `Explain the main takeaways from this session.`
    ],
    summary: shortSummary,
  };
}

// GET /summaries/session/:liveSessionId – Fetch AI summary for a live session
router.get('/session/:liveSessionId', async (req, res) => {
  try {
    const { liveSessionId } = req.params;
    const summary = await LectureSummary.findOne({ live_session_id: liveSessionId });

    if (!summary) {
      return res.status(404).json({
        summaryAvailable: false,
        message: 'AI summary will be available once a transcript is provided.',
      });
    }

    res.json({ summaryAvailable: true, summary: summary.toJSON() });
  } catch (err) {
    console.error('Fetch summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary', details: err.message });
  }
});

// POST /summaries/upload-transcript/:liveSessionId – Upload transcript and generate AI summary
router.post('/upload-transcript/:liveSessionId', authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { liveSessionId } = req.params;
    const { transcript_text } = req.body;

    if (!transcript_text || transcript_text.trim().length < 10) {
      return res.status(400).json({ error: 'Valid transcript text is required to generate an AI summary.' });
    }

    const session = await LiveSession.findById(liveSessionId);
    const sessionTitle = session?.title || 'Lecture Session';
    const courseId = session?.course_id;

    const aiData = generateSummaryFromTranscript(transcript_text, sessionTitle);

    const summaryRecord = {
      live_session_id: liveSessionId,
      course_id: courseId,
      summary_text: aiData.summary,
      key_points: aiData.key_topics,
      generated_at: new Date(),
    };

    const updated = await LectureSummary.findOneAndUpdate(
      { live_session_id: liveSessionId },
      { $set: summaryRecord },
      { upsert: true, new: true }
    );

    res.status(201).json({
      message: 'AI Summary generated successfully from lecture transcript!',
      summary: {
        ...updated.toJSON(),
        ...aiData,
      },
    });
  } catch (err) {
    console.error('Upload transcript summary error:', err);
    res.status(500).json({ error: 'Failed to generate summary', details: err.message });
  }
});

module.exports = router;
