const courseDAO = require('../dao/courseDAO');

/**
 * Middleware to verify user has access to a specific course.
 * Checks:
 * - Admins: always have access
 * - Instructors: must be assigned to the course
 * - Students: must be enrolled in the course
 *
 * Expects req.params.courseId to be set.
 * Attaches req.courseRole = 'admin' | 'instructor' | 'student' | null
 */
function requireCourseAccess(...allowedCourseRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const courseId = req.params.courseId;
      if (!courseId) {
        return res.status(400).json({ error: 'Course ID is required' });
      }

      const { role, id } = req.user;

      // Admins always have access
      if (role === 'admin') {
        req.courseRole = 'admin';
        return next();
      }

      // Instructors: check course assignment
      if (role === 'instructor') {
        const isAssigned = await courseDAO.isInstructorAssigned(courseId, id);
        if (isAssigned) {
          req.courseRole = 'instructor';
          if (allowedCourseRoles.length === 0 || allowedCourseRoles.includes('instructor')) {
            return next();
          }
        }
        return res.status(403).json({ error: 'You are not assigned to this course' });
      }

      // Students: check course enrollment
      if (role === 'student') {
        const isEnrolled = await courseDAO.isStudentEnrolled(courseId, id);
        if (isEnrolled) {
          req.courseRole = 'student';
          if (allowedCourseRoles.length === 0 || allowedCourseRoles.includes('student')) {
            return next();
          }
        }
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }

      return res.status(403).json({ error: 'Access denied' });
    } catch (err) {
      console.error('Course access check error:', err);
      return res.status(500).json({ error: 'Failed to verify course access' });
    }
  };
}

module.exports = requireCourseAccess;
