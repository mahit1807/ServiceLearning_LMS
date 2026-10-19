import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { EmptyState, PageLoader } from '../../components/common/EmptyState';
import { Table } from '../../components/common/Table';
import { formatDateTime } from '../../utils/helpers';
import { UserCheck } from 'lucide-react';

export default function Attendance() {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      if (profile?.role === 'student') {
        const res = await api.get(`/attendance/student/${profile.id}`);
        setAttendance(res.data.attendance || []);
      } else {
        // For instructor/admin, get attendance from their courses
        const coursesRes = await api.get('/courses');
        const courses = coursesRes.data.courses || [];
        const allAttendance = [];
        for (const c of courses) {
          const res = await api.get(`/attendance/course/${c.id}`);
          const records = (res.data.attendance || []).map(a => ({
            ...a,
            courseName: c.course_name,
          }));
          allAttendance.push(...records);
        }
        setAttendance(allAttendance);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">{attendance.length} record{attendance.length !== 1 ? 's' : ''}</p>
      </div>

      {attendance.length === 0 ? (
        <EmptyState icon={UserCheck} title="No Attendance Records" description="Attendance data will appear once live sessions have been conducted and synced." />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Table
            columns={[
              { header: 'Session', render: (r) => r.live_sessions?.title || r.courseName || '—' },
              { header: 'Participant', render: (r) => r.profiles?.full_name || r.participant_name || '—' },
              { header: 'Join Time', render: (r) => formatDateTime(r.join_time) },
              { header: 'Leave Time', render: (r) => formatDateTime(r.leave_time) },
              { header: 'Duration', render: (r) => r.duration ? `${Math.round(r.duration / 60)} min` : '—' },
            ]}
            data={attendance}
          />
        </div>
      )}
    </div>
  );
}
