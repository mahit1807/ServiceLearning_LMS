const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const courseDAO = require('../dao/courseDAO');
const { Material } = require('../models');

router.use(authenticate);

// POST /materials – Create material (instructor/admin)
router.post('/', authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { course_id, title, description, file_url, file_type } = req.body;
    if (!course_id || !title) {
      return res.status(400).json({ error: 'Course ID and title are required' });
    }

    if (req.user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(course_id, req.user.id);
      if (!isAssigned) {
        return res.status(403).json({ error: 'You are not assigned to this course' });
      }
    }

    const material = new Material({
      course_id,
      title: title.trim(),
      description: description ? description.trim() : '',
      file_url: file_url || null,
      file_type: file_type || 'pdf',
      uploaded_by: req.user.id,
    });

    const saved = await material.save();
    res.status(201).json({ material: saved.toJSON() });
  } catch (err) {
    console.error('Create material error:', err);
    res.status(500).json({ error: 'Failed to create material' });
  }
});

// GET /materials/course/:courseId – Get materials for a course
router.get('/course/:courseId', async (req, res) => {
  try {
    const { role, id } = req.user;
    const courseId = req.params.courseId;

    if (role === 'student') {
      const isEnrolled = await courseDAO.isStudentEnrolled(courseId, id);
      if (!isEnrolled) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }
    } else if (role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(courseId, id);
      if (!isAssigned) {
        return res.status(403).json({ error: 'You are not assigned to this course' });
      }
    }

    const materials = await Material.find({ course_id: courseId }).sort({ created_at: -1 });
    res.json({ materials: materials.map(m => m.toJSON()) });
  } catch (err) {
    console.error('Fetch materials error:', err);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// DELETE /materials/:id – Delete material (instructor/admin)
router.delete('/:id', authorize('instructor', 'admin'), async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    if (req.user.role === 'instructor') {
      const isAssigned = await courseDAO.isInstructorAssigned(material.course_id, req.user.id);
      if (!isAssigned) {
        return res.status(403).json({ error: 'You are not assigned to this course' });
      }
    }

    await Material.findByIdAndDelete(req.params.id);
    res.json({ message: 'Material deleted successfully' });
  } catch (err) {
    console.error('Delete material error:', err);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

module.exports = router;
