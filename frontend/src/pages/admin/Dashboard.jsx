import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { StatCard } from '../../components/common/Card';
import { CardSkeleton } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { formatDate, getRelativeTime, getInitials } from '../../utils/helpers';
import {
  Users, GraduationCap, BookOpen, Video, ClipboardList, UserCheck,
  ArrowRight, TrendingUp, FileText, Plus
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CardSkeleton count={6} />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-saffron-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Admin Dashboard
            </p>
            <h1 className="text-3xl font-bold font-display mt-1">System Overview</h1>
            <p className="text-gray-400 mt-2">Manage users, courses, and monitor system activity</p>
          </div>
          <Link
            to="/admin/courses-assignments?tab=courses&create=true"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-saffron-500 hover:bg-saffron-600 text-white rounded-xl text-sm font-semibold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Create Course
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Students" value={stats?.totalStudents || 0} icon={GraduationCap} color="blue" />
        <StatCard title="Total Instructors" value={stats?.totalInstructors || 0} icon={Users} color="purple" />
        <StatCard title="Total Courses" value={stats?.totalCourses || 0} icon={BookOpen} color="green" />
        <StatCard title="Live Sessions" value={stats?.totalSessions || 0} icon={Video} color="orange" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Assignments" value={stats?.totalAssignments || 0} icon={ClipboardList} color="pink" />
        <StatCard title="Submissions" value={stats?.totalSubmissions || 0} icon={FileText} color="cyan" />
        <StatCard title="Attendance Records" value={stats?.totalAttendanceRecords || 0} icon={UserCheck} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Recent Users</h2>
            <Link to="/admin/users" className="text-sm text-saffron-600 hover:text-saffron-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {(stats?.recentUsers || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No users yet</p>
            ) : (
              stats.recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">{getInitials(user.full_name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <Badge variant={user.role === 'admin' ? 'danger' : user.role === 'instructor' ? 'purple' : 'info'}>
                    {user.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Courses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Recent Courses</h2>
            <Link to="/admin/courses" className="text-sm text-saffron-600 hover:text-saffron-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {(stats?.recentCourses || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No courses yet</p>
            ) : (
              stats.recentCourses.map((course) => (
                <Link
                  key={course.id}
                  to={`/admin/courses/${course.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{course.course_name}</p>
                    <p className="text-xs text-gray-400">{course.course_code} • {getRelativeTime(course.created_at)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
