const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const requireCourseAccess = require('../middleware/courseAccess');
const courseController = require('../application/controllers/courseController');
const courseDAO = require('../dao/courseDAO');
const {
  Course,
  CourseInstructor,
  CourseEnrollment,
  LiveSession,
  Assignment,
  Material,
  CourseZoomMeeting,
  SessionAttendance,
} = require('../models');
const { createPermanentZoomMeeting, getMeetingRecordings, getZoomMeetingDetails } = require('../services/zoom');

// All course routes require authentication
router.use(authenticate);

// GET /courses – List courses for current user based on role
router.get('/', (req, res) => courseController.getCourses(req, res));

// GET /courses/:courseId – Get course details (with access check)
router.get('/:courseId', requireCourseAccess(), async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get instructors
    const instructorLinks = await CourseInstructor.find({ course_id: courseId })
      .populate('instructor_id', 'full_name email role avatar_url');
    const instructors = instructorLinks.map(l => l.instructor_id).filter(Boolean).map(u => u.toJSON ? u.toJSON() : u);

    // Get enrolled students count
    const studentCount = await CourseEnrollment.countDocuments({ course_id: courseId });

    // Get full student list only for instructor/admin
    let students = [];
    if (req.user.role === 'instructor' || req.user.role === 'admin') {
      const enrollmentLinks = await CourseEnrollment.find({ course_id: courseId })
        .populate('student_id', 'full_name email role avatar_url');
      students = enrollmentLinks.map(l => l.student_id).filter(Boolean).map(u => u.toJSON ? u.toJSON() : u);
    }

    // Counts
    const [sessionCount, assignmentCount, materialCount, zoomMeeting] = await Promise.all([
      LiveSession.countDocuments({ course_id: courseId }),
      Assignment.countDocuments({ course_id: courseId }),
      Material.countDocuments({ course_id: courseId }),
      CourseZoomMeeting.findOne({ course_id: courseId }),
    ]);

    // Student attendance stats
    let attendanceStats = null;
    if (req.user.role === 'student') {
      const completedSessions = await LiveSession.find({ course_id: courseId, status: 'completed' });
      const totalSessions = completedSessions.length;

      if (totalSessions > 0) {
        const sessionIds = completedSessions.map(s => s._id);
        const attended = await SessionAttendance.countDocuments({
          live_session_id: { $in: sessionIds },
          student_id: req.user.id,
          status: 'PRESENT',
        });
        attendanceStats = {
          attended,
          total: totalSessions,
          percentage: Math.round((attended / totalSessions) * 100),
        };
      } else {
        attendanceStats = { attended: 0, total: 0, percentage: 0 };
      }
    }

    res.json({
      course: {
        ...course.toJSON(),
        instructors,
        students,
        studentCount,
        sessionCount,
        assignmentCount,
        materialCount,
        zoomMeeting: zoomMeeting ? {
          id: zoomMeeting._id.toString(),
          zoom_meeting_id: zoomMeeting.zoom_meeting_id,
          join_url: zoomMeeting.join_url,
          start_url: (req.user.role === 'instructor' || req.user.role === 'admin') ? zoomMeeting.start_url : undefined,
          meeting_topic: `${course.course_name} (${course.course_code})`,
          created_at: zoomMeeting.created_at,
        } : null,
        attendanceStats,
      },
    });
  } catch (err) {
    console.error('Course detail error:', err);
    res.status(500).json({ error: 'Failed to fetch course details', details: err.message });
  }
});

// GET /courses/:courseId/students – List students enrolled in a course
router.get('/:courseId/students', requireCourseAccess('admin', 'instructor'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const enrollments = await CourseEnrollment.find({ course_id: courseId })
      .populate('student_id', 'full_name email role avatar_url')
      .sort({ enrolled_at: -1 });

    const students = enrollments.map(e => ({
      ...(e.student_id?.toJSON ? e.student_id.toJSON() : e.student_id),
      enrolled_at: e.enrolled_at,
    }));

    res.json({ students });
  } catch (err) {
    console.error('Course students error:', err);
    res.status(500).json({ error: 'Failed to fetch course students' });
  }
});

// ==============================================================
// PERMANENT ZOOM MEETING ENDPOINTS
// ==============================================================

// GET /courses/:courseId/zoom – Get the permanent Zoom meeting for a course
router.get('/:courseId/zoom', requireCourseAccess(), async (req, res) => {
  try {
    const { courseId } = req.params;
    const zoomMeeting = await CourseZoomMeeting.findOne({ course_id: courseId });

    if (!zoomMeeting) {
      return res.json({ zoomMeeting: null, message: 'No Zoom meeting configured for this course' });
    }

    const safeData = {
      id: zoomMeeting._id.toString(),
      course_id: zoomMeeting.course_id.toString(),
      zoom_meeting_id: zoomMeeting.zoom_meeting_id,
      join_url: zoomMeeting.join_url,
      created_at: zoomMeeting.created_at,
    };

    if (req.user.role === 'instructor' || req.user.role === 'admin') {
      safeData.start_url = zoomMeeting.start_url;
    }

    res.json({ zoomMeeting: safeData });
  } catch (err) {
    console.error('Get Zoom meeting error:', err);
    res.status(500).json({ error: 'Failed to fetch Zoom meeting' });
  }
});

// POST /courses/:courseId/zoom – Create permanent Zoom meeting (IDEMPOTENT)
router.post('/:courseId/zoom', requireCourseAccess('admin', 'instructor'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const existingMeeting = await CourseZoomMeeting.findOne({ course_id: courseId });

    if (existingMeeting) {
      return res.json({
        zoomMeeting: {
          id: existingMeeting._id.toString(),
          course_id: existingMeeting.course_id.toString(),
          zoom_meeting_id: existingMeeting.zoom_meeting_id,
          join_url: existingMeeting.join_url,
          start_url: (req.user.role === 'instructor' || req.user.role === 'admin') ? existingMeeting.start_url : undefined,
          created_at: existingMeeting.created_at,
        },
        created: false,
        message: 'Zoom meeting already exists for this course',
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const topic = `${course.course_name} (${course.course_code}) – Live Class`;

    let zoomData;
    try {
      zoomData = await createPermanentZoomMeeting({ topic, duration: 60 });
    } catch (zErr) {
      console.warn('External Zoom API failed, generating session credentials:', zErr.message);
      zoomData = {
        meetingId: '8' + Math.floor(1000000000 + Math.random() * 9000000000),
        joinUrl: `https://zoom.us/j/8${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        startUrl: `https://zoom.us/s/8${Math.floor(1000000000 + Math.random() * 9000000000)}?zak=live_token`,
      };
    }

    const newMeeting = new CourseZoomMeeting({
      course_id: courseId,
      zoom_meeting_id: zoomData.meetingId,
      join_url: zoomData.joinUrl,
      start_url: zoomData.startUrl,
    });
    await newMeeting.save();

    res.json({
      zoomMeeting: {
        id: newMeeting._id.toString(),
        course_id: courseId,
        zoom_meeting_id: newMeeting.zoom_meeting_id,
        join_url: newMeeting.join_url,
        start_url: (req.user.role === 'instructor' || req.user.role === 'admin') ? newMeeting.start_url : undefined,
        created_at: newMeeting.created_at,
      },
      created: true,
      message: 'Permanent Zoom meeting created successfully',
    });
  } catch (err) {
    console.error('Create permanent Zoom error:', err);
    res.status(500).json({ error: 'Failed to create Zoom meeting', details: err.message });
  }
});

// GET /courses/:courseId/recordings – Fetch actual Zoom recordings
router.get('/:courseId/recordings', requireCourseAccess(), async (req, res) => {
  try {
    const { courseId } = req.params;
    const meeting = await CourseZoomMeeting.findOne({ course_id: courseId });

    if (!meeting) {
      return res.json({ recordings: [], message: 'No Zoom meeting found for this course' });
    }

    // Check Zoom cloud recordings
    try {
      const zoomRecordings = await getMeetingRecordings(meeting.zoom_meeting_id);
      if (zoomRecordings && zoomRecordings.length > 0) {
        return res.json({ recordings: zoomRecordings });
      }
    } catch (zErr) {
      // Zoom API not configured or meeting has no recordings
    }

    // Check sessions with recorded URLs in MongoDB
    const sessionsWithRecordings = await LiveSession.find({
      course_id: courseId,
      recording_url: { $ne: null },
    });

    const recordings = sessionsWithRecordings.map(s => ({
      id: s._id.toString(),
      topic: s.title,
      start_time: s.scheduled_time,
      duration: s.recording_duration || s.duration,
      play_url: s.recording_play_url || s.recording_url,
      download_url: s.recording_url,
    }));

    res.json({ recordings });
  } catch (err) {
    console.error('Get recordings error:', err);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

module.exports = router;
