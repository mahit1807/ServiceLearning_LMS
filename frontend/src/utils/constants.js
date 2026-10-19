export const ROLES = {
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  ADMIN: 'admin',
};

export const ASSIGNMENT_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  LATE: 'late',
  GRADED: 'graded',
};

export const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  submitted: 'bg-blue-100 text-blue-800 border-blue-200',
  late: 'bg-red-100 text-red-800 border-red-200',
  graded: 'bg-green-100 text-green-800 border-green-200',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  ongoing: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

export const SIDEBAR_ITEMS = {
  student: [
    { label: 'Dashboard', path: '/student/dashboard', icon: 'LayoutDashboard' },
    { label: 'Courses & Assignments', path: '/student/courses-assignments', icon: 'BookOpen' },
    { label: 'Live Classes & Attendance', path: '/student/live-classes', icon: 'Video' },
    { label: 'Profile', path: '/student/profile', icon: 'User' },
  ],
  instructor: [
    { label: 'Dashboard', path: '/instructor/dashboard', icon: 'LayoutDashboard' },
    { label: 'Courses & Assignments', path: '/instructor/courses-assignments', icon: 'BookOpen' },
    { label: 'Live Classes & Attendance', path: '/instructor/live-classes', icon: 'Video' },
    { label: 'Profile', path: '/instructor/profile', icon: 'User' },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'LayoutDashboard' },
    { label: 'Users', path: '/admin/users', icon: 'Users' },
    { label: 'Courses & Assignments', path: '/admin/courses-assignments', icon: 'BookOpen' },
    { label: 'Live Classes & Attendance', path: '/admin/live-classes', icon: 'Video' },
    { label: 'Settings', path: '/admin/settings', icon: 'Settings' },
  ],
};
