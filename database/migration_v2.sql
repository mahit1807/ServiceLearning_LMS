-- ============================================================
-- ISKCON LMS – Migration V2
-- Permanent Course Zoom Meetings + Recordings
-- Run this AFTER schema.sql has been applied
-- ============================================================

-- ============================================================
-- 1. COURSE ZOOM MEETINGS (permanent per-course meeting)
-- ============================================================
CREATE TABLE IF NOT EXISTS course_zoom_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  zoom_meeting_id TEXT NOT NULL,
  join_url TEXT NOT NULL,
  start_url TEXT,
  meeting_topic TEXT,
  auto_recording TEXT DEFAULT 'cloud',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id)  -- ONE course = ONE permanent Zoom meeting
);

CREATE INDEX IF NOT EXISTS idx_czm_course ON course_zoom_meetings(course_id);
CREATE INDEX IF NOT EXISTS idx_czm_zoom_id ON course_zoom_meetings(zoom_meeting_id);

-- ============================================================
-- 2. ZOOM RECORDINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS zoom_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  zoom_meeting_id TEXT NOT NULL,
  recording_url TEXT,
  play_url TEXT,
  recording_start TIMESTAMPTZ,
  recording_end TIMESTAMPTZ,
  duration INTEGER DEFAULT 0,
  file_size BIGINT DEFAULT 0,
  recording_type TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('processing', 'available', 'deleted')),
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zr_course ON zoom_recordings(course_id);
CREATE INDEX IF NOT EXISTS idx_zr_zoom_id ON zoom_recordings(zoom_meeting_id);

-- ============================================================
-- 3. RLS for new tables
-- ============================================================
ALTER TABLE course_zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_recordings ENABLE ROW LEVEL SECURITY;

-- Course Zoom Meetings: everyone can read, inserts/updates via service role
CREATE POLICY "czm_select" ON course_zoom_meetings FOR SELECT USING (true);
CREATE POLICY "czm_insert" ON course_zoom_meetings FOR INSERT WITH CHECK (true);
CREATE POLICY "czm_update" ON course_zoom_meetings FOR UPDATE USING (true);
CREATE POLICY "czm_delete" ON course_zoom_meetings FOR DELETE USING (true);

-- Zoom Recordings: everyone can read, inserts/updates via service role
CREATE POLICY "zr_select" ON zoom_recordings FOR SELECT USING (true);
CREATE POLICY "zr_insert" ON zoom_recordings FOR INSERT WITH CHECK (true);
CREATE POLICY "zr_update" ON zoom_recordings FOR UPDATE USING (true);
CREATE POLICY "zr_delete" ON zoom_recordings FOR DELETE USING (true);
