-- ============================================================
-- ISKCON LMS – Seed Data
-- Run AFTER schema.sql and AFTER creating auth users via Supabase dashboard or API
-- ============================================================

-- NOTE: You must first create users in Supabase Auth, then insert their profiles here.
-- The UUIDs below are placeholders. Replace them with actual auth.users IDs.

-- ============================================================
-- SAMPLE PROFILES (replace UUIDs with real auth user IDs)
-- ============================================================

-- To create test users, use Supabase Dashboard > Authentication > Users > Add User
-- Then copy each user's UUID here.

-- Example admin
-- INSERT INTO profiles (id, full_name, email, role) VALUES
--   ('ADMIN_UUID_HERE', 'Admin Prabhu', 'admin@iskcon.org', 'admin');

-- Example instructors
-- INSERT INTO profiles (id, full_name, email, role) VALUES
--   ('INSTRUCTOR1_UUID', 'Radha Govinda Das', 'instructor1@iskcon.org', 'instructor'),
--   ('INSTRUCTOR2_UUID', 'Madhava Priya Devi Dasi', 'instructor2@iskcon.org', 'instructor');

-- Example students
-- INSERT INTO profiles (id, full_name, email, role) VALUES
--   ('STUDENT1_UUID', 'Arjuna Das', 'student1@iskcon.org', 'student'),
--   ('STUDENT2_UUID', 'Rukmini Devi Dasi', 'student2@iskcon.org', 'student'),
--   ('STUDENT3_UUID', 'Krishna Chaitanya Das', 'student3@iskcon.org', 'student');


-- ============================================================
-- SAMPLE COURSES
-- ============================================================
INSERT INTO courses (id, course_code, course_name, description) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'BG10101', 'Bhagavad Gita – As It Is',
   'A comprehensive study of the Bhagavad Gita with verse-by-verse analysis, covering all 18 chapters. Students will learn the philosophical teachings of Lord Krishna to Arjuna on the battlefield of Kurukshetra.'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'BY20201', 'Bhakti Yoga Fundamentals',
   'Introduction to the nine processes of devotional service (Navavidha Bhakti). This course covers sravanam, kirtanam, smaranam, pada-sevanam, arcanam, vandanam, dasyam, sakhyam, and atma-nivedanam.'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'SK30301', 'Spiritual Knowledge & Philosophy',
   'Deep dive into Vedic philosophy including the nature of the soul, karma, reincarnation, the three modes of material nature, and the path to spiritual liberation as taught in the Srimad Bhagavatam.')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SAMPLE ASSIGNMENTS (uncomment after inserting profiles)
-- ============================================================

-- INSERT INTO assignments (course_id, title, description, due_date, created_by) VALUES
--   ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Chapter 1 Summary',
--    'Write a 500-word summary of Bhagavad Gita Chapter 1 – Observing the Armies on the Battlefield of Kurukshetra.',
--    NOW() + INTERVAL '7 days', 'INSTRUCTOR1_UUID'),
--   ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Chapter 2 Verse Analysis',
--    'Select 5 key verses from Chapter 2 and explain their significance in your own words.',
--    NOW() + INTERVAL '14 days', 'INSTRUCTOR1_UUID'),
--   ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Personal Sadhana Report',
--    'Document your daily sadhana practice for one week. Include japa count, mangala arati attendance, and reading hours.',
--    NOW() + INTERVAL '10 days', 'INSTRUCTOR2_UUID');


-- ============================================================
-- SAMPLE MATERIALS (uncomment after inserting profiles)
-- ============================================================

-- INSERT INTO materials (course_id, title, description, file_url, created_by) VALUES
--   ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bhagavad Gita PDF – Complete Text',
--    'The complete Bhagavad Gita As It Is by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada.',
--    'https://vedabase.io/en/library/bg/', 'INSTRUCTOR1_UUID'),
--   ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Chapter 1 Lecture Notes',
--    'Detailed lecture notes covering the first chapter of the Bhagavad Gita.',
--    'https://example.com/chapter1-notes.pdf', 'INSTRUCTOR1_UUID'),
--   ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Nine Processes of Bhakti – Overview',
--    'A comprehensive guide to the nine processes of devotional service.',
--    'https://example.com/navavidha-bhakti.pdf', 'INSTRUCTOR2_UUID');
