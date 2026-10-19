import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { StatCard } from '../../components/common/Card';
import { CardSkeleton } from '../../components/common/EmptyState';
import { formatDateTime } from '../../utils/helpers';
import {
  BookOpen, Users, Video, ClipboardList, ArrowRight, Clock, Plus
} from 'lucide-react';

export default function InstructorDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, coursesRes, sessionsRes] = await Promise.all([
        api.get('/users/dashboard-stats'),
        api.get('/courses'),
        api.get('/live-sessions/upcoming'),
      ]);
      setStats(statsRes.data);
      setCourses(coursesRes.data.courses || []);
      setUpcomingSessions(sessionsRes.data.sessions || []);
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
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-purple-700 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-purple-200 text-sm font-medium">Instructor Dashboard</p>
            <h1 className="text-3xl font-bold font-display mt-1">{profile?.full_name}</h1>
            <p className="text-purple-200 mt-2">Manage your courses and students</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/instructor/courses-assignments?tab=courses&create=true"
              className="inline-flex items-center gap-2 px-4 py-2 bg-saffron-500 hover:bg-saffron-600 text-white rounded-xl text-sm font-semibold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Create Course
            </Link>
            <Link
              to="/instructor/sessions"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-xl text-sm font-semibold hover:bg-white/30 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Session
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Assigned Courses" value={stats?.assignedCourses || 0} icon={BookOpen} color="blue" />
        <StatCard title="Total Students" value={stats?.totalStudents || 0} icon={Users} color="green" />
        <StatCard title="Total Sessions" value={stats?.totalSessions || 0} icon={Video} color="purple" />
        <StatCard title="Assignments" value={stats?.totalAssignments || 0} icon={ClipboardList} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Courses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">My Courses</h2>
            <Link to="/instructor/courses" className="text-sm text-saffron-600 hover:text-saffron-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {courses.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 mb-3">No courses assigned or created yet</p>
                <Link
                  to="/instructor/courses-assignments?tab=courses&create=true"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-saffron-50 text-saffron-600 hover:bg-saffron-100 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Course
                </Link>
              </div>
            ) : (
              courses.slice(0, 5).map((course) => (
                <Link
                  key={course.id}
                  to={`/instructor/courses/${course.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
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
            <Link to="/instructor/sessions" className="text-sm text-saffron-600 hover:text-saffron-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No upcoming sessions</p>
            ) : (
              upcomingSessions.slice(0, 5).map((session) => (
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
                  {session.start_url && (
                    <a
                      href={session.start_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Start
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
