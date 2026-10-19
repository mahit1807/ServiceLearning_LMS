import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { EmptyState, PageLoader } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/Badge';
import { formatDateTime, formatDuration } from '../../utils/helpers';
import { Video, Clock, ExternalLink } from 'lucide-react';

export default function Sessions() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = profile?.role === 'admin';
  const isInstructorOrAdmin = profile?.role === 'instructor' || profile?.role === 'admin';

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const endpoint = isAdmin ? '/live-sessions/all' : '/live-sessions/upcoming';
      const res = await api.get(endpoint);
      setSessions(res.data.sessions || []);
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
        <h1 className="text-2xl font-bold font-display text-gray-900">Live Sessions</h1>
        <p className="text-sm text-gray-500 mt-1">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon={Video} title="No Sessions" description="No live sessions available." />
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Video className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{s.courses?.course_name || ''} {s.courses?.course_code ? `(${s.courses.course_code})` : ''}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDateTime(s.scheduled_time)}
                      </span>
                      <span className="text-xs text-gray-400">{formatDuration(s.duration)}</span>
                      <StatusBadge status={s.status} />
                    </div>
                    {s.zoom_meeting_id && <p className="text-xs text-gray-400 mt-1">Meeting ID: {s.zoom_meeting_id}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {s.join_url && profile?.role === 'student' && (
                    <a href={s.join_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors">
                      <ExternalLink className="w-4 h-4" /> Join Session
                    </a>
                  )}
                  {s.start_url && isInstructorOrAdmin && (
                    <a href={s.start_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors">
                      <ExternalLink className="w-4 h-4" /> Start Session
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
