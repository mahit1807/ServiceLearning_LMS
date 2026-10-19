import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input, Select, Textarea } from '../../components/common/Input';
import { Table } from '../../components/common/Table';
import { EmptyState, CardSkeleton } from '../../components/common/EmptyState';
import { Badge, StatusBadge } from '../../components/common/Badge';
import { formatDateTime, formatDuration } from '../../utils/helpers';
import { Video, UserCheck, Play, RefreshCw, Calendar, Clock, ExternalLink, Plus, Film, Sparkles, FileText, Upload } from 'lucide-react';

export default function LiveClassesAttendanceModule() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'upcoming';

  const [sessions, setSessions] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [dbRecordings, setDbRecordings] = useState({});
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [viewAttendanceModalSession, setViewAttendanceModalSession] = useState(null);
  const [sessionAttendanceList, setSessionAttendanceList] = useState([]);
  const [watchRecordingModal, setWatchRecordingModal] = useState(null);

  // AI Summary Modal State
  const [aiSummaryModalSession, setAiSummaryModalSession] = useState(null);
  const [currentAiSummary, setCurrentAiSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [submittingTranscript, setSubmittingTranscript] = useState(false);

  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const toast = useToast();

  const role = profile?.role || 'student';
  const isAdmin = role === 'admin';
  const isInstructor = role === 'instructor';
  const isStudent = role === 'student';
  const isInstructorOrAdmin = isInstructor || isAdmin;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch courses
      const cRes = await api.get('/courses');
      const courseList = cRes.data.courses || [];
      setCourses(courseList);

      // 2. Fetch live sessions (admins & instructors get all sessions for complete stats)
      const sEndpoint = isInstructorOrAdmin ? '/live-sessions/all' : '/live-sessions';
      const sRes = await api.get(sEndpoint);
      const allSessions = sRes.data.sessions || [];
      setSessions(allSessions);

      // 3. Fetch attendance
      if (isStudent) {
        try {
          const attRes = await api.get(`/attendance/student/${profile?.id || 'me'}`);
          setAttendanceRecords(attRes.data.attendance || []);
        } catch (aErr) {
          console.warn('Student attendance fetch warning:', aErr.message);
        }
      } else {
        const allAtt = [];
        for (const c of courseList) {
          try {
            const aRes = await api.get(`/attendance/course/${c.id}`);
            const recs = (aRes.data.attendance || []).map(r => ({ ...r, courseName: c.course_name }));
            allAtt.push(...recs);
          } catch (_) {}
        }
        setAttendanceRecords(allAtt);
      }
    } catch (err) {
      console.error('Error loading live classes & attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create Live Session
  const handleCreateSession = async () => {
    if (!formData.course_id || !formData.title?.trim() || !formData.scheduled_time) {
      toast.warning('Course, session title, and scheduled time are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/live-sessions/create', {
        ...formData,
        title: formData.title.trim(),
        duration: parseInt(formData.duration, 10) || 60,
      });
      toast.success(res.data.message || 'Zoom Live Session scheduled successfully!');
      setShowCreateSessionModal(false);
      setFormData({});
      await loadData();
    } catch (err) {
      const details = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to create live session';
      toast.error(`Failed to schedule class: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Sync Attendance via POST /attendance/fetch/:liveSessionId
  const handleSyncAttendance = async (sessionId) => {
    setSyncingId(sessionId);
    try {
      const res = await api.post(`/attendance/fetch/${sessionId}`);
      toast.success(res.data.message || 'Attendance synced successfully!');
      await loadData();
    } catch (err) {
      const details = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to sync attendance';
      toast.error(`Sync error: ${details}`);
    } finally {
      setSyncingId(null);
    }
  };

  // View Attendance for a specific session
  const handleViewSessionAttendance = async (session) => {
    setViewAttendanceModalSession(session);
    try {
      const res = await api.get(`/attendance/session/${session.id}`);
      setSessionAttendanceList(res.data.attendance || []);
    } catch (err) {
      console.error(err);
      setSessionAttendanceList([]);
    }
  };

  // View / Open AI Summary Modal
  const handleOpenAiSummary = async (session) => {
    setAiSummaryModalSession(session);
    setLoadingSummary(true);
    setCurrentAiSummary(null);
    setTranscriptText('');

    try {
      const res = await api.get(`/summaries/session/${session.id}`);
      if (res.data.summaryAvailable && res.data.summary) {
        setCurrentAiSummary(res.data.summary);
      }
    } catch (err) {
      // 404 means no summary exists yet for this session
      setCurrentAiSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Upload Transcript and Generate AI Summary
  const handleGenerateSummary = async () => {
    if (!transcriptText || transcriptText.trim().length < 10) {
      toast.warning('Please enter valid lecture transcript text');
      return;
    }
    setSubmittingTranscript(true);
    try {
      const res = await api.post(`/summaries/upload-transcript/${aiSummaryModalSession.id}`, {
        transcript_text: transcriptText
      });
      toast.success('AI Summary generated successfully from lecture transcript!');
      setCurrentAiSummary(res.data.summary);
      setTranscriptText('');
    } catch (err) {
      const details = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to generate summary';
      toast.error(`Summary error: ${details}`);
    } finally {
      setSubmittingTranscript(false);
    }
  };

  // Categorize sessions accurately by date and status accounting for duration in IST
  const now = new Date();
  const upcomingSessions = sessions.filter(s => {
    const sessionTime = new Date(s.scheduled_time);
    const durationMs = (Number(s.duration) || 60) * 60 * 1000;
    const endTime = new Date(sessionTime.getTime() + durationMs);
    return (s.status === 'scheduled' || s.status === 'ongoing') && endTime >= now;
  });
  const pastSessions = sessions.filter(s => {
    const sessionTime = new Date(s.scheduled_time);
    const durationMs = (Number(s.duration) || 60) * 60 * 1000;
    const endTime = new Date(sessionTime.getTime() + durationMs);
    return s.status === 'completed' || endTime < now;
  });

  // Real count of available recordings (strictly non-empty URL)
  const availableRecordingsCount = pastSessions.filter(s => Boolean(s.recording_url || s.play_url)).length;

  if (loading) return <CardSkeleton count={4} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900 flex items-center gap-2">
            <Video className="w-7 h-7 text-purple-600" />
            Live Classes & Attendance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Zoom Integration, Automated Participant Attendance, Verified Recordings, and AI Lecture Summaries.
          </p>
        </div>

        {isInstructorOrAdmin && (
          <Button icon={Plus} onClick={() => { setFormData({}); setShowCreateSessionModal(true); }}>
            Schedule Live Class
          </Button>
        )}
      </div>

      {/* Stats Summary Bar for Admin / Instructor */}
      {isInstructorOrAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Total Live Classes</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{sessions.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Upcoming</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{upcomingSessions.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Completed</p>
            <p className="text-xl font-bold text-green-600 mt-1">{pastSessions.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Attendance Syncs</p>
            <p className="text-xl font-bold text-purple-600 mt-1">{attendanceRecords.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Recordings Ready</p>
            <p className="text-xl font-bold text-saffron-600 mt-1">{availableRecordingsCount}</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setSearchParams({ tab: 'upcoming' })}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'upcoming'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Upcoming Classes ({upcomingSessions.length})
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'past' })}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'past'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <Film className="w-4 h-4" />
          Past Classes & Recordings ({pastSessions.length})
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'attendance' })}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Attendance Records ({attendanceRecords.length})
        </button>
      </div>

      {/* Tab 1: Upcoming Classes */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingSessions.length === 0 ? (
            <EmptyState icon={Video} title="No Upcoming Classes" description="No upcoming Zoom live sessions are scheduled right now." />
          ) : (
            upcomingSessions.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Video className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md">
                      {s.courses?.course_name || s.course_name || 'Course Lecture'}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mt-2">{s.title}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5" /> {formatDateTime(s.scheduled_time)} (IST)
                      </span>
                      <span className="text-xs text-gray-400">{formatDuration(s.duration)}</span>
                      <StatusBadge status="scheduled" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {s.join_url && (
                    <a
                      href={s.join_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-sm transition-all"
                    >
                      <ExternalLink className="w-4 h-4" /> Join Zoom
                    </a>
                  )}

                  {s.start_url && isInstructorOrAdmin && (
                    <a
                      href={s.start_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-sm transition-all"
                    >
                      <ExternalLink className="w-4 h-4" /> Host / Start
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Past Classes & Recordings */}
      {activeTab === 'past' && (
        <div className="space-y-4">
          {pastSessions.length === 0 ? (
            <EmptyState icon={Film} title="No Past Classes" description="Past lectures with verified attendance sync and cloud recordings will appear here." />
          ) : (
            pastSessions.map((s) => {
              const hasRealRecording = Boolean(s.recording_url || s.play_url);
              const isProcessing = s.recording_status === 'processing';

              return (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Film className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{s.title}</h3>
                      <p className="text-xs font-semibold text-gray-500 mt-0.5">{s.courses?.course_name || 'Course Lecture'}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {formatDateTime(s.scheduled_time)} (IST)
                        </span>
                        <Badge variant="success">Completed</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* View Attendance button */}
                    <button
                      onClick={() => handleViewSessionAttendance(s)}
                      className="px-4 py-2 text-xs font-bold text-purple-700 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" /> View Attendance
                    </button>

                    {/* View AI Summary button */}
                    <button
                      onClick={() => handleOpenAiSummary(s)}
                      className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-600" /> View AI Summary
                    </button>

                    {/* Sync Attendance button for Instructor/Admin */}
                    {isInstructorOrAdmin && (
                      <button
                        onClick={() => handleSyncAttendance(s.id)}
                        disabled={syncingId === s.id}
                        className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncingId === s.id ? 'animate-spin' : ''}`} />
                        {syncingId === s.id ? 'Syncing...' : 'Sync Attendance'}
                      </button>
                    )}

                    {/* Watch Recording / Status indicator strictly based on real Zoom data */}
                    {hasRealRecording ? (
                      <a
                        href={s.recording_url || s.play_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 text-xs font-bold text-white bg-saffron-500 rounded-xl hover:bg-saffron-600 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Play className="w-4 h-4 fill-white" /> Watch Recording
                      </a>
                    ) : isProcessing ? (
                      <span className="px-3.5 py-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 animate-pulse" /> Recording processing...
                      </span>
                    ) : (
                      <span className="px-3 py-2 text-xs font-medium text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
                        Recording not available
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: Attendance Records */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {attendanceRecords.length === 0 ? (
            <EmptyState icon={UserCheck} title="No Attendance Records" description="Attendance records will be populated automatically when Zoom participant reports are synced." />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <Table
                columns={[
                  { header: 'Participant', render: (r) => (
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{r.profiles?.full_name || r.participant_name}</p>
                      <p className="text-xs text-gray-400">{r.profiles?.email || r.user_email || '—'}</p>
                    </div>
                  )},
                  { header: 'Session / Course', render: (r) => r.live_sessions?.title || r.courseName || 'Lecture Session' },
                  { header: 'Status', render: (r) => {
                    const st = r.status || 'PRESENT';
                    let badgeColor = 'bg-green-100 text-green-800';
                    if (st === 'ABSENT') badgeColor = 'bg-red-100 text-red-800';
                    else if (st === 'LATE') badgeColor = 'bg-yellow-100 text-yellow-800';
                    else if (st === 'PARTIAL') badgeColor = 'bg-blue-100 text-blue-800';
                    return <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${badgeColor}`}>{st}</span>;
                  }},
                  { header: 'Join Time', render: (r) => formatDateTime(r.join_time) },
                  { header: 'Leave Time', render: (r) => formatDateTime(r.leave_time) },
                  { header: 'Duration', render: (r) => r.duration ? `${r.duration} mins` : '0 mins' },
                ]}
                data={attendanceRecords}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal: Schedule Live Class */}
      <Modal isOpen={showCreateSessionModal} onClose={() => setShowCreateSessionModal(false)} title="Schedule Zoom Live Class" footer={
        <><Button variant="secondary" onClick={() => setShowCreateSessionModal(false)}>Cancel</Button>
        <Button onClick={handleCreateSession} loading={submitting}>Schedule Class</Button></>
      }>
        <div className="space-y-4">
          <Select label="Course" value={formData.course_id || ''} onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}>
            <option value="">Select course...</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.course_name || c.title}</option>)}
          </Select>
          <Input label="Session Title" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Session 1: Observing the Armies..." required />
          <Input label="Scheduled Date & Time (IST)" type="datetime-local" value={formData.scheduled_time || ''} onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })} required />
          <Input label="Duration (minutes)" type="number" value={formData.duration || 60} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} />
        </div>
      </Modal>

      {/* Modal: View Session Attendance Details */}
      <Modal isOpen={!!viewAttendanceModalSession} onClose={() => setViewAttendanceModalSession(null)} title={`Attendance: ${viewAttendanceModalSession?.title || ''}`} footer={
        <Button variant="secondary" onClick={() => setViewAttendanceModalSession(null)}>Close</Button>
      }>
        <div className="space-y-4">
          {sessionAttendanceList.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No attendance records synced for this session yet. Click "Sync Attendance" to fetch Zoom report.</p>
          ) : (
            <Table
              columns={[
                { header: 'Student', render: (r) => r.profiles?.full_name || r.participant_name },
                { header: 'Status', render: (r) => <span className={`font-bold text-xs px-2 py-0.5 rounded ${r.status === 'ABSENT' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{r.status || 'PRESENT'}</span> },
                { header: 'Join Time', render: (r) => formatDateTime(r.join_time) },
                { header: 'Duration', render: (r) => `${r.duration || 0} mins` },
              ]}
              data={sessionAttendanceList}
            />
          )}
        </div>
      </Modal>

      {/* Modal: View AI Summary / Upload Transcript */}
      <Modal isOpen={!!aiSummaryModalSession} onClose={() => setAiSummaryModalSession(null)} title={`AI Lecture Summary – ${aiSummaryModalSession?.title || ''}`} footer={
        <Button variant="secondary" onClick={() => setAiSummaryModalSession(null)}>Close</Button>
      }>
        <div className="space-y-4">
          {/* Disclosure & Source Tag */}
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">AI Lecture Summary — Source: {currentAiSummary?.transcript_source || 'Lecture Transcript'}</p>
              <p className="text-[11px] text-indigo-600 mt-0.5">AI-generated content — verify important information against the original lecture recording.</p>
            </div>
          </div>

          {loadingSummary ? (
            <p className="text-sm text-gray-500 py-6 text-center">Loading AI lecture summary...</p>
          ) : currentAiSummary ? (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Overview</h4>
                <p className="text-sm text-gray-800 mt-1 bg-gray-50 p-3 rounded-xl border border-gray-100">{currentAiSummary.overview}</p>
              </div>

              {Array.isArray(currentAiSummary.key_topics) && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">2. Key Topics Covered</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">
                    {currentAiSummary.key_topics.map((t, idx) => <li key={idx}>{t}</li>)}
                  </ul>
                </div>
              )}

              {currentAiSummary.key_concepts && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">3. Important Concepts</h4>
                  <p className="text-sm text-gray-700 mt-1">{currentAiSummary.key_concepts}</p>
                </div>
              )}

              {Array.isArray(currentAiSummary.key_takeaways) && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">4. Key Takeaways</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">
                    {currentAiSummary.key_takeaways.map((t, idx) => <li key={idx}>{t}</li>)}
                  </ul>
                </div>
              )}

              {currentAiSummary.revision_notes && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">5. Student Revision Notes</h4>
                  <p className="text-sm text-gray-700 mt-1 bg-saffron-50 p-3 rounded-xl border border-saffron-100">{currentAiSummary.revision_notes}</p>
                </div>
              )}

              {Array.isArray(currentAiSummary.review_questions) && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">6. Questions to Review</h4>
                  <ol className="list-decimal list-inside text-sm text-gray-700 mt-1 space-y-1">
                    {currentAiSummary.review_questions.map((q, idx) => <li key={idx}>{q}</li>)}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                AI summary will be available once a transcript is provided for this lecture.
              </p>

              {isInstructorOrAdmin && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600" /> Upload Lecture Transcript
                  </h4>
                  <p className="text-xs text-gray-500">Paste the text transcript of this lecture to generate the AI summary.</p>
                  <Textarea
                    value={transcriptText}
                    onChange={(e) => setTranscriptText(e.target.value)}
                    placeholder="Paste lecture transcript or lecture notes here..."
                    rows={6}
                  />
                  <Button icon={Sparkles} onClick={handleGenerateSummary} loading={submittingTranscript}>
                    Generate AI Summary
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
