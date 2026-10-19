require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const {
  User,
  Course,
  CourseInstructor,
  CourseEnrollment,
  Assignment,
  Material,
  LiveSession,
} = require('./models');

async function seed() {
  console.log('🌱 Starting optional development database seed script...');
  await connectDB();

  console.log('Clearing existing test data...');
  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    CourseInstructor.deleteMany({}),
    CourseEnrollment.deleteMany({}),
    Assignment.deleteMany({}),
    Material.deleteMany({}),
    LiveSession.deleteMany({}),
  ]);

  console.log('Creating default users...');
  const admin = await User.create({
    email: 'admin@iskcon.org',
    password: 'Password123',
    full_name: 'System Administrator',
    role: 'admin',
  });

  const instructor = await User.create({
    email: 'instructor@iskcon.org',
    password: 'Password123',
    full_name: 'HG Gaura Das',
    role: 'instructor',
  });

  const student = await User.create({
    email: 'student@iskcon.org',
    password: 'Password123',
    full_name: 'Krishna Dasa',
    role: 'student',
  });

  console.log('Creating initial course...');
  const course = await Course.create({
    course_code: 'BG10101',
    course_name: 'Bhagavad Gita As It Is - Overview',
    description: 'Comprehensive study of the foundational verses and philosophical wisdom of Bhagavad Gita.',
    created_by: admin._id,
  });

  console.log('Assigning instructor and enrolling student...');
  await CourseInstructor.create({
    course_id: course._id,
    instructor_id: instructor._id,
  });

  await CourseEnrollment.create({
    course_id: course._id,
    student_id: student._id,
  });

  console.log('Creating sample assignment...');
  await Assignment.create({
    course_id: course._id,
    title: 'Chapter 2 Analysis: The Nature of the Soul',
    description: 'Write a concise review highlighting verses 2.11 through 2.30.',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_by: instructor._id,
  });

  console.log('✅ Development database seed completed successfully!');
  console.log('Test Accounts created:');
  console.log('  Admin:      admin@iskcon.org      / Password123');
  console.log('  Instructor: instructor@iskcon.org / Password123');
  console.log('  Student:    student@iskcon.org    / Password123');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
