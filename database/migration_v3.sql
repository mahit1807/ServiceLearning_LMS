-- ============================================================
-- ISKCON LMS – Migration V3
-- Lecture Summaries & Transcripts Table
-- ============================================================

CREATE TABLE IF NOT EXISTS lecture_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE UNIQUE,
  transcript_text TEXT,
  summary TEXT,
  overview TEXT,
  key_topics JSONB,
  key_concepts TEXT,
  key_takeaways JSONB,
  examples TEXT,
  revision_notes TEXT,
  review_questions JSONB,
  transcript_source TEXT DEFAULT 'lecture_transcript',
  model_used TEXT DEFAULT 'AI Summarizer',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ls_summaries_session ON lecture_summaries(live_session_id);

ALTER TABLE lecture_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ls_summaries_select" ON lecture_summaries FOR SELECT USING (true);
CREATE POLICY "ls_summaries_insert" ON lecture_summaries FOR INSERT WITH CHECK (true);
CREATE POLICY "ls_summaries_update" ON lecture_summaries FOR UPDATE USING (true);
