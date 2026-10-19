import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { StatCard } from '../../components/common/Card';
import { CardSkeleton } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/Badge';
import { formatDate, formatDateTime, truncate } from '../../utils/helpers';
import {
  BookOpen, ClipboardList, Video, UserCheck, Calendar, ArrowRight, Clock
} from 'lucide-react';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, coursesRes, sessionsRes, assignmentsRes] = await Promise.all([
        api.get('/users/dashboard-stats'),
        api.get('/courses'),
        api.get('/live-sessions/upcoming'),
        api.get('/assignments/pending/me'),
      ]);
      setStats(statsRes.data);
      setCourses(coursesRes.data.courses || []);
      setUpcomingSessions(sessionsRes.data.sessions || []);
      setPendingAssignments(assignmentsRes.data.assignments || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <CardSkeleton count={6} />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-saffron-500 via-saffron-600 to-orange-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <p className="text-saffron-100 text-sm font-medium">Welcome back,</p>
          <h1 className="text-3xl font-bold font-display mt-1">{profile?.full_name}</h1>
          <p className="text-saffron-100 mt-2">Continue your spiritual learning journey</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Enrolled Courses" value={stats?.enrolledCourses || 0} icon={BookOpen} color="blue" />
        <StatCard title="Submitted Assignments" value={stats?.submittedAssignments || 0} icon={ClipboardList} color="green" />
        <StatCard title="Sessions Attended" value={stats?.attendedSessions || 0} icon={UserCheck} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Courses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">My Courses</h2>
            <Link to="/student/courses" className="text-sm text-saffron-600 hover:text-saffron-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {courses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No courses enrolled yet</p>
            ) : (
              courses.slice(0, 4).map((course) => (
                <Link
                  key={course.id}
                  to={`/student/courses/${course.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{course.course_name}</p>
                    <p className="text-xs text-gray-400">{course.course_code}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h2>
            <Link to="/student/sessions" className="text-sm text-saffron-600 hover:text-saffron-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No upcoming sessions</p>
            ) : (
              upcomingSessions.slice(0, 4).map((session) => (
                <div key={session.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Video className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{session.title}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(session.scheduled_time)}
                    </p>
                  </div>
                  {session.join_url && (
                    <a
                      href={session.join_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Join
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Assignments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Pending Assignments</h2>
            <Link to="/student/assignments" className="text-sm text-saffron-600 hover:text-saffron-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {pendingAssignments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No pending assignments</p>
            ) : (
              pendingAssignments.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400">{a.courses?.course_name || ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-red-500 font-medium">Due: {formatDate(a.due_date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
