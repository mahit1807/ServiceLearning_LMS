-- ============================================================
-- ISKCON LMS – Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================================
-- 2. COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_code VARCHAR(7) NOT NULL UNIQUE,
  course_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);

-- ============================================================
-- 3. COURSE INSTRUCTORS (junction)
-- ============================================================
CREATE TABLE IF NOT EXISTS course_instructors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, instructor_id)
);

CREATE INDEX IF NOT EXISTS idx_ci_course ON course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_ci_instructor ON course_instructors(instructor_id);

-- ============================================================
-- 4. COURSE ENROLLMENTS (student ↔ course)
-- ============================================================
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_ce_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_ce_student ON course_enrollments(student_id);

-- ============================================================
-- 5. LIVE SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  zoom_meeting_id TEXT,
  join_url TEXT,
  start_url TEXT,
  scheduled_time TIMESTAMPTZ NOT NULL,
  duration INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ls_course ON live_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_ls_scheduled ON live_sessions(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_ls_status ON live_sessions(status);

-- ============================================================
-- 6. SESSION ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS session_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  live_session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  participant_name TEXT,
  join_time TIMESTAMPTZ,
  leave_time TIMESTAMPTZ,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sa_session ON session_attendance(live_session_id);
CREATE INDEX IF NOT EXISTS idx_sa_student ON session_attendance(student_id);

-- ============================================================
-- 7. ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  attachment_path TEXT,
  attachment_name TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON assignments(due_date);

-- ============================================================
-- 8. ASSIGNMENT SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_url TEXT,
  submission_text TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('pending', 'submitted', 'late', 'graded')),
  marks NUMERIC(5,2),
  feedback TEXT,
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_as_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_as_student ON assignment_submissions(student_id);

-- ============================================================
-- 9. MATERIALS
-- ============================================================
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_course ON materials(course_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_service" ON profiles FOR INSERT WITH CHECK (true);

-- Courses: everyone can read
CREATE POLICY "courses_select" ON courses FOR SELECT USING (true);
CREATE POLICY "courses_insert" ON courses FOR INSERT WITH CHECK (true);
CREATE POLICY "courses_update" ON courses FOR UPDATE USING (true);
CREATE POLICY "courses_delete" ON courses FOR DELETE USING (true);

-- Course instructors: everyone can read
CREATE POLICY "ci_select" ON course_instructors FOR SELECT USING (true);
CREATE POLICY "ci_insert" ON course_instructors FOR INSERT WITH CHECK (true);
CREATE POLICY "ci_update" ON course_instructors FOR UPDATE USING (true);
CREATE POLICY "ci_delete" ON course_instructors FOR DELETE USING (true);

-- Course enrollments
CREATE POLICY "ce_select" ON course_enrollments FOR SELECT USING (true);
CREATE POLICY "ce_insert" ON course_enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "ce_delete" ON course_enrollments FOR DELETE USING (true);

-- Live sessions
CREATE POLICY "ls_select" ON live_sessions FOR SELECT USING (true);
CREATE POLICY "ls_insert" ON live_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "ls_update" ON live_sessions FOR UPDATE USING (true);

-- Session attendance
CREATE POLICY "sa_select" ON session_attendance FOR SELECT USING (true);
CREATE POLICY "sa_insert" ON session_attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "sa_delete" ON session_attendance FOR DELETE USING (true);

-- Assignments
CREATE POLICY "assignments_select" ON assignments FOR SELECT USING (true);
CREATE POLICY "assignments_insert" ON assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "assignments_update" ON assignments FOR UPDATE USING (true);
CREATE POLICY "assignments_delete" ON assignments FOR DELETE USING (true);

-- Assignment submissions
CREATE POLICY "sub_select" ON assignment_submissions FOR SELECT USING (true);
CREATE POLICY "sub_insert" ON assignment_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "sub_update" ON assignment_submissions FOR UPDATE USING (true);

-- Materials
CREATE POLICY "materials_select" ON materials FOR SELECT USING (true);
CREATE POLICY "materials_insert" ON materials FOR INSERT WITH CHECK (true);
CREATE POLICY "materials_update" ON materials FOR UPDATE USING (true);
CREATE POLICY "materials_delete" ON materials FOR DELETE USING (true);
