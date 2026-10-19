const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const userDAO = require('../dao/userDAO');
const courseController = require('../application/controllers/courseController');

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// GET /admin/stats – Dashboard statistics from MongoDB
router.get('/stats', async (req, res) => {
  try {
    const stats = await userDAO.getAdminStats();
    res.json(stats);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics', details: err.message });
  }
});

// GET /admin/users – List all users with optional filters
router.get('/users', async (req, res) => {
  try {
    const { role, search } = req.query;
    const users = await userDAO.getUsers({ role, search });
    res.json({ users });
  } catch (err) {
    console.error('Users error:', err);
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// POST /admin/create-instructor – Create a new instructor
router.post('/create-instructor', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    const existing = await userDAO.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const newUser = await userDAO.createUser({
      email,
      password,
      full_name,
      role: 'instructor',
    });

    res.status(201).json({
      message: 'Instructor created successfully',
      userId: newUser.id,
      user: newUser,
    });
  } catch (err) {
    console.error('Create instructor error:', err);
    res.status(500).json({ error: 'Failed to create instructor', details: err.message });
  }
});

// POST /admin/create-admin – Create a new admin
router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    const existing = await userDAO.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const newUser = await userDAO.createUser({
      email,
      password,
      full_name,
      role: 'admin',
    });

    res.status(201).json({
      message: 'Admin created successfully',
      userId: newUser.id,
      user: newUser,
    });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ error: 'Failed to create admin', details: err.message });
  }
});

// POST /admin/create-student – Create a new student
router.post('/create-student', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    const existing = await userDAO.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const newUser = await userDAO.createUser({
      email,
      password,
      full_name,
      role: 'student',
    });

    res.status(201).json({
      message: 'Student created successfully',
      userId: newUser.id,
      user: newUser,
    });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: 'Failed to create student', details: err.message });
  }
});

// DELETE /admin/delete-admin/:adminId – Delete an admin
router.delete('/delete-admin/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;

    if (adminId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    const target = await userDAO.findUserById(adminId);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (target.role !== 'admin') {
      return res.status(400).json({ error: 'Target user is not an admin' });
    }

    await userDAO.deleteUser(adminId);
    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    console.error('Delete admin error:', err);
    res.status(500).json({ error: 'Failed to delete admin', details: err.message });
  }
});

// Mount 3-Layer Course Routes under /courses
router.use('/courses', require('../application/routes/courseRoutes'));

// Course assignment & enrollment operations
router.post('/assign-instructor', (req, res) => courseController.assignInstructor(req, res));
router.post('/enroll-student', (req, res) => courseController.enrollStudent(req, res));
router.delete('/unenroll-student', (req, res) => courseController.unenrollStudent(req, res));

// GET /admin/instructors – List all instructors
router.get('/instructors', async (req, res) => {
  try {
    const instructors = await userDAO.getInstructors();
    res.json({ instructors });
  } catch (err) {
    console.error('Fetch instructors error:', err);
    res.status(500).json({ error: 'Failed to fetch instructors', details: err.message });
  }
});

// GET /admin/students – List all students
router.get('/students', async (req, res) => {
  try {
    const students = await userDAO.getStudents();
    res.json({ students });
  } catch (err) {
    console.error('Fetch students error:', err);
    res.status(500).json({ error: 'Failed to fetch students', details: err.message });
  }
});

module.exports = router;
