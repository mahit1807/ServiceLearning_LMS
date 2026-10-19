import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../lib/api';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input, Textarea } from '../../components/common/Input';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Table } from '../../components/common/Table';
import { EmptyState, PageLoader } from '../../components/common/EmptyState';
import { formatDate, formatDateTime, formatDuration, getInitials } from '../../utils/helpers';
import {
  BookOpen, Users, Video, ClipboardList, FileText, UserCheck,
  Plus, ExternalLink, Clock, Calendar, ArrowLeft, Send,
  Wifi, WifiOff, Play, RefreshCw, Shield, Eye, Link as LinkIcon,
  CheckCircle, AlertCircle, BarChart3, Monitor,
  Edit2, Trash2, Download, Paperclip, X, AlertTriangle
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
function getPdfUrl(url) {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
}

const TABS = {
  student: ['Overview', 'Live Classes', 'Assignments', 'Attendance', 'Materials'],
  instructor: ['Overview', 'Live Classes', 'Assignments', 'Attendance', 'Materials', 'Students'],
  admin: ['Overview', 'Live Classes', 'Assignments', 'Attendance', 'Materials', 'Students'],
};

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();
  const [course, setCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [showDeleteCourse, setShowDeleteCourse] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [zoomLoading, setZoomLoading] = useState(false);
  const fileInputRef = useRef(null);

  const role = profile?.role || 'student';
  const isInstructorOrAdmin = role === 'instructor' || role === 'admin';
  const basePath = `/${role}`;
  const tabs = TABS[role] || TABS.student;

  useEffect(() => { loadCourse(); }, [courseId]);
  useEffect(() => { loadTabData(); }, [activeTab, courseId]);

  const loadCourse = async () => {
    try {
      const res = await api.get(`/courses/${courseId}`);
      setCourse(res.data.course);
    } catch (err) {
      console.error('Load course error:', err);
      toast.error(err.response?.data?.error || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async () => {
    try {
      if (activeTab === 'Materials') {
        const res = await api.get(`/materials/course/${courseId}`);
        setMaterials(res.data.materials || []);
      } else if (activeTab === 'Assignments') {
        const res = await api.get(`/assignments/course/${courseId}`);
        setAssignments(res.data.assignments || []);
      } else if (activeTab === 'Live Classes') {
        const [sessRes, recRes] = await Promise.all([
          api.get(`/live-sessions/course/${courseId}`),
          api.get(`/courses/${courseId}/recordings`).catch(() => ({ data: { recordings: [] } })),
        ]);
        setSessions(sessRes.data.sessions || []);
        setRecordings(recRes.data.recordings || []);
      } else if (activeTab === 'Attendance') {
        const res = await api.get(`/live-sessions/course/${courseId}`);
        setSessions(res.data.sessions || []);
      }
    } catch (err) {
      console.error('Tab data error:', err);
    }
  };

  // ==================== ZOOM ACTIONS ====================

  const handleCreateZoomMeeting = async () => {
    setZoomLoading(true);
    try {
      const res = await api.post(`/courses/${courseId}/zoom`);
      if (res.data.created) {
        toast.success('Permanent Zoom meeting created successfully!');
      } else {
        toast.info('Zoom meeting already exists for this course.');
      }
      await loadCourse();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create Zoom meeting');
    } finally {
      setZoomLoading(false);
    }
  };

  const handleSyncRecordings = async () => {
    try {
      toast.info('Syncing recordings from Zoom...');
      const res = await api.post(`/courses/${courseId}/recordings/sync`);
      toast.success(res.data.message || 'Recordings synced!');
      loadTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to sync recordings');
    }
  };

  // ==================== CRUD ACTIONS ====================

  const handleAddMaterial = async () => {
    setSubmitting(true);
    try {
      await api.post('/materials', { course_id: courseId, ...formData });
      toast.success('Material added successfully');
      setShowModal(null);
      setFormData({});
      loadTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add material');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Invalid file type: Please select a valid PDF file (.pdf)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10 MB limit');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleAddAssignment = async () => {
    if (!formData.title?.trim()) {
      toast.warning('Assignment title is required');
      return;
    }
    setSubmitting(true);
    try {
      const uploadData = new FormData();
      uploadData.append('course_id', courseId);
      uploadData.append('title', formData.title.trim());
      if (formData.description) uploadData.append('description', formData.description.trim());
      if (formData.due_date) uploadData.append('due_date', formData.due_date);
      if (selectedFile) uploadData.append('pdf', selectedFile);

      await api.post('/assignments', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(selectedFile ? 'Assignment created with PDF attachment!' : 'Assignment created successfully');
      setShowModal(null);
      setFormData({});
      setSelectedFile(null);
      loadTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAssignment = async () => {
    if (!formData.title?.trim()) {
      toast.warning('Assignment title is required');
      return;
    }
    setSubmitting(true);
    try {
      const uploadData = new FormData();
      uploadData.append('title', formData.title.trim());
      if (formData.description !== undefined) uploadData.append('description', formData.description.trim());
      if (formData.due_date) uploadData.append('due_date', formData.due_date);
      if (selectedFile) uploadData.append('pdf', selectedFile);
      if (formData.remove_attachment) uploadData.append('remove_attachment', 'true');

      await api.put(`/assignments/${editingAssignment.id}`, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Assignment updated successfully!');
      setEditingAssignment(null);
      setFormData({});
      setSelectedFile(null);
      loadTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/assignments/${deletingAssignment.id}`);
      toast.success('Assignment deleted successfully!');
      setDeletingAssignment(null);
      loadTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCourse = async () => {
    if (!formData.course_name?.trim()) {
      toast.warning('Course name is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/admin/courses/${courseId}`, {
        course_name: formData.course_name.trim(),
        description: formData.description?.trim(),
      });
      toast.success('Course updated successfully!');
      setShowEditCourse(false);
      setFormData({});
      loadCourse();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/admin/courses/${courseId}`);
      toast.success('Course deleted successfully!');
      setShowDeleteCourse(false);
      navigate(`/${role}/courses-assignments`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSession = async () => {
    setSubmitting(true);
    try {
      const res = await api.post('/live-sessions/create', { course_id: courseId, ...formData });
      if (res.data.usedPermanentMeeting) {
        toast.success('Session created using the permanent course Zoom meeting!');
      } else if (res.data.zoomCreated) {
        toast.success('Zoom meeting created successfully!');
      } else {
        toast.warning('Session created but Zoom meeting creation failed.');
      }
      setShowModal(null);
      setFormData({});
      loadTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAssignment = async () => {
    setSubmitting(true);
    try {
      await api.post(`/assignments/${selectedAssignment.id}/submit`, formData);
      toast.success('Assignment submitted!');
      setShowModal(null);
      setFormData({});
      setSelectedAssignment(null);
      loadTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFetchAttendance = async (sessionId) => {
    try {
      toast.info('Fetching attendance from Zoom...');
      await api.post(`/attendance/fetch/${sessionId}`);
      toast.success('Attendance synced successfully!');
      loadTabData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch attendance');
    }
  };

  if (loading) return <PageLoader />;
  if (!course) return <EmptyState title="Course Not Found" description="The course you're looking for doesn't exist or you don't have access." />;

  const zoomMeeting = course.zoomMeeting;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Link to={`${basePath}/courses`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      {/* Course Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-saffron-400 to-saffron-600" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{course.course_code}</span>
                {zoomMeeting && (
                  <Badge variant="success">
                    <Wifi className="w-3 h-3 mr-1" /> Zoom Connected
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold font-display text-gray-900">{course.course_name}</h1>
              <p className="text-gray-500 mt-2 max-w-2xl">{course.description}</p>
              {course.instructors?.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-gray-400">Instructors:</span>
                  {course.instructors.map(inst => (
                    <span key={inst.id} className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      {inst.full_name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {role === 'admin' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Edit2}
                  onClick={() => {
                    setFormData({
                      course_name: course.course_name || course.title,
                      description: course.description || '',
                    });
                    setShowEditCourse(true);
                  }}
                >
                  Edit Course
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => setShowDeleteCourse(true)}
                >
                  Delete Course
                </Button>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-blue-900">{course.studentCount || 0}</p>
              <p className="text-xs text-blue-600">Students</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <Video className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-purple-900">{course.sessionCount || 0}</p>
              <p className="text-xs text-purple-600">Sessions</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <ClipboardList className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-900">{course.assignmentCount || 0}</p>
              <p className="text-xs text-green-600">Assignments</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <FileText className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-orange-900">{course.materialCount || 0}</p>
              <p className="text-xs text-orange-600">Materials</p>
            </div>
            {course.attendanceStats && (
              <div className="bg-teal-50 rounded-xl p-3 text-center">
                <UserCheck className="w-5 h-5 text-teal-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-teal-900">{course.attendanceStats.percentage}%</p>
                <p className="text-xs text-teal-600">{course.attendanceStats.attended}/{course.attendanceStats.total} Attended</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 px-4 overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-saffron-500 text-saffron-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* ==================== OVERVIEW ==================== */}
          {activeTab === 'Overview' && (
            <OverviewTab
              course={course}
              zoomMeeting={zoomMeeting}
              isInstructorOrAdmin={isInstructorOrAdmin}
              onCreateZoom={handleCreateZoomMeeting}
              zoomLoading={zoomLoading}
              assignments={assignments}
              basePath={basePath}
              role={role}
            />
          )}

          {/* ==================== LIVE CLASSES ==================== */}
          {activeTab === 'Live Classes' && (
            <LiveClassesTab
              course={course}
              zoomMeeting={zoomMeeting}
              sessions={sessions}
              recordings={recordings}
              isInstructorOrAdmin={isInstructorOrAdmin}
              role={role}
              onCreateZoom={handleCreateZoomMeeting}
              zoomLoading={zoomLoading}
              onCreateSession={() => { setFormData({}); setShowModal('session'); }}
              onFetchAttendance={handleFetchAttendance}
              onSyncRecordings={handleSyncRecordings}
            />
          )}

          {/* ==================== ASSIGNMENTS ==================== */}
          {activeTab === 'Assignments' && (
            <AssignmentsTab
              assignments={assignments}
              isInstructorOrAdmin={isInstructorOrAdmin}
              role={role}
              basePath={basePath}
              onAdd={() => { setFormData({}); setSelectedFile(null); setShowModal('assignment'); }}
              onEdit={(a) => {
                setFormData({
                  title: a.title,
                  description: a.description || '',
                  due_date: a.due_date ? a.due_date.slice(0, 16) : '',
                });
                setSelectedFile(null);
                setEditingAssignment(a);
              }}
              onDelete={(a) => setDeletingAssignment(a)}
              onSubmit={(a) => { setSelectedAssignment(a); setFormData({}); setShowModal('submit'); }}
            />
          )}

          {/* ==================== ATTENDANCE ==================== */}
          {activeTab === 'Attendance' && (
            <AttendanceTab
              course={course}
              sessions={sessions}
              isInstructorOrAdmin={isInstructorOrAdmin}
              onFetch={handleFetchAttendance}
              role={role}
              courseId={courseId}
            />
          )}

          {/* ==================== MATERIALS ==================== */}
          {activeTab === 'Materials' && (
            <MaterialsTab
              materials={materials}
              isInstructorOrAdmin={isInstructorOrAdmin}
              onAdd={() => { setFormData({}); setShowModal('material'); }}
            />
          )}

          {/* ==================== STUDENTS ==================== */}
          {activeTab === 'Students' && (
            <StudentsTab students={course.students || []} />
          )}
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Add Material Modal */}
      <Modal isOpen={showModal === 'material'} onClose={() => setShowModal(null)} title="Add Material" footer={
        <><Button variant="secondary" onClick={() => setShowModal(null)}>Cancel</Button>
        <Button onClick={handleAddMaterial} loading={submitting}>Add Material</Button></>
      }>
        <div className="space-y-4">
          <Input label="Title" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <Textarea label="Description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <Input label="File/Resource URL" value={formData.file_url || ''} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })} placeholder="https://..." />
        </div>
      </Modal>

      {/* Create Assignment Modal with PDF */}
      <Modal isOpen={showModal === 'assignment'} onClose={() => setShowModal(null)} title="Create Assignment" footer={
        <><Button variant="secondary" onClick={() => setShowModal(null)}>Cancel</Button>
        <Button onClick={handleAddAssignment} loading={submitting}>Create Assignment</Button></>
      }>
        <div className="space-y-4">
          <Input label="Title" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Chapter 2 Verses 11-30 Essay" required />
          <Textarea label="Description / Instructions" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Assignment overview..." />
          <Input label="Due Date" type="datetime-local" value={formData.due_date || ''} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />

          {/* PDF Attachment Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Attach PDF Material (Optional)</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-gray-50/50">
              {selectedFile ? (
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-600" />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-gray-800">{selectedFile.name}</p>
                      <p className="text-[11px] text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Paperclip className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-600 font-medium">Upload assignment reference PDF</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">PDF only, max 10 MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="cd-assignment-pdf-upload"
                  />
                  <label
                    htmlFor="cd-assignment-pdf-upload"
                    className="inline-block mt-2 px-3 py-1.5 text-xs font-bold text-saffron-700 bg-saffron-50 hover:bg-saffron-100 rounded-lg cursor-pointer transition-colors"
                  >
                    Select PDF File
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal isOpen={!!editingAssignment} onClose={() => setEditingAssignment(null)} title={`Edit Assignment: ${editingAssignment?.title || ''}`} footer={
        <><Button variant="secondary" onClick={() => setEditingAssignment(null)}>Cancel</Button>
        <Button onClick={handleEditAssignment} loading={submitting}>Save Changes</Button></>
      }>
        <div className="space-y-4">
          <Input label="Title" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <Textarea label="Description / Instructions" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <Input label="Due Date" type="datetime-local" value={formData.due_date || ''} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />

          {/* Current Attachment / Replace */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">PDF Attachment</label>
            {editingAssignment?.attachment_name && !formData.remove_attachment && !selectedFile && (
              <div className="flex items-center justify-between bg-red-50/60 p-3 rounded-lg border border-red-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  <span className="text-xs font-semibold text-red-800">{editingAssignment.attachment_name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, remove_attachment: true })}
                  className="text-xs font-bold text-red-600 hover:text-red-800 underline"
                >
                  Remove Attachment
                </button>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center bg-gray-50/50">
              {selectedFile ? (
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-gray-800">{selectedFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="cd-edit-assignment-pdf-upload"
                  />
                  <label
                    htmlFor="cd-edit-assignment-pdf-upload"
                    className="inline-block px-3 py-1.5 text-xs font-bold text-saffron-700 bg-saffron-50 hover:bg-saffron-100 rounded-lg cursor-pointer transition-colors"
                  >
                    {editingAssignment?.attachment_name ? 'Replace PDF with New File' : 'Attach PDF File'}
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Assignment Modal */}
      <Modal isOpen={!!deletingAssignment} onClose={() => setDeletingAssignment(null)} title="Delete Assignment" footer={
        <><Button variant="secondary" onClick={() => setDeletingAssignment(null)}>Cancel</Button>
        <Button variant="danger" onClick={handleDeleteAssignment} loading={submitting}>Delete Assignment</Button></>
      }>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">This will permanently delete this assignment and attached PDF.</p>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{deletingAssignment?.title}</strong>?
          </p>
        </div>
      </Modal>

      {/* Edit Course Modal */}
      <Modal isOpen={showEditCourse} onClose={() => setShowEditCourse(false)} title="Edit Course" footer={
        <><Button variant="secondary" onClick={() => setShowEditCourse(false)}>Cancel</Button>
        <Button onClick={handleEditCourse} loading={submitting}>Save Changes</Button></>
      }>
        <div className="space-y-4">
          <Input label="Course Name" value={formData.course_name || ''} onChange={(e) => setFormData({ ...formData, course_name: e.target.value })} required />
          <Textarea label="Description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
        </div>
      </Modal>

      {/* Delete Course Modal */}
      <Modal isOpen={showDeleteCourse} onClose={() => setShowDeleteCourse(false)} title="Delete Course" footer={
        <><Button variant="secondary" onClick={() => setShowDeleteCourse(false)}>Cancel</Button>
        <Button variant="danger" onClick={handleDeleteCourse} loading={submitting}>Delete Course</Button></>
      }>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">This action cannot be undone.</p>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete course <strong>{course?.course_name}</strong>?
          </p>
        </div>
      </Modal>

      {/* Create Session Modal */}
      <Modal isOpen={showModal === 'session'} onClose={() => setShowModal(null)} title="Schedule Live Session" footer={
        <><Button variant="secondary" onClick={() => setShowModal(null)}>Cancel</Button>
        <Button onClick={handleCreateSession} loading={submitting}>Schedule Session</Button></>
      }>
        <div className="space-y-4">
          {zoomMeeting && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> This session will use the permanent course Zoom meeting
              </p>
              <p className="text-xs text-blue-600 mt-1">The same Zoom join link will be used for all sessions.</p>
            </div>
          )}
          <Input label="Session Title" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <Input label="Date & Time" type="datetime-local" value={formData.scheduled_time || ''} onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })} required />
          <Input label="Duration (minutes)" type="number" value={formData.duration || 60} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} />
        </div>
      </Modal>

      {/* Submit Assignment Modal */}
      <Modal isOpen={showModal === 'submit'} onClose={() => { setShowModal(null); setSelectedAssignment(null); }} title={`Submit: ${selectedAssignment?.title || ''}`} footer={
        <><Button variant="secondary" onClick={() => setShowModal(null)}>Cancel</Button>
        <Button onClick={handleSubmitAssignment} loading={submitting}>Submit Assignment</Button></>
      }>
        <div className="space-y-4">
          <Input label="Submission URL" value={formData.submission_url || ''} onChange={(e) => setFormData({ ...formData, submission_url: e.target.value })} placeholder="https://drive.google.com/..." />
          <Textarea label="Or write your submission" value={formData.submission_text || ''} onChange={(e) => setFormData({ ...formData, submission_text: e.target.value })} placeholder="Type your answer here..." />
        </div>
      </Modal>
    </div>
  );
}

// ================================================================
// OVERVIEW TAB
// ================================================================
function OverviewTab({ course, zoomMeeting, isInstructorOrAdmin, onCreateZoom, zoomLoading }) {
  return (
    <div className="space-y-6">
      {/* Course Description */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">About this Course</h3>
        <p className="text-gray-600 leading-relaxed">{course.description || 'No description available.'}</p>
      </div>

      {/* Zoom Meeting Card */}
      <div className="border border-gray-100 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${zoomMeeting ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gray-200'}`}>
            <Video className={`w-5 h-5 ${zoomMeeting ? 'text-white' : 'text-gray-500'}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Zoom Live Class</h3>
            <p className="text-xs text-gray-500">
              {zoomMeeting ? 'Permanent Course Meeting' : 'No meeting configured'}
            </p>
          </div>
          {zoomMeeting && (
            <Badge variant="success" className="ml-auto">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
              Connected
            </Badge>
          )}
        </div>

        {zoomMeeting ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/70 rounded-lg px-3 py-2">
              <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-xs truncate flex-1 font-mono">{zoomMeeting.join_url}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield className="w-3 h-3" />
              <span>Meeting ID: {zoomMeeting.zoom_meeting_id}</span>
              <span className="text-gray-300">•</span>
              <span>Auto Recording: {zoomMeeting.auto_recording === 'cloud' ? '☁️ Cloud' : zoomMeeting.auto_recording === 'local' ? '💻 Local' : '❌ None'}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <a
                href={zoomMeeting.join_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow-md transition-all"
              >
                <Video className="w-4 h-4" /> Join Zoom Meeting
              </a>
              {isInstructorOrAdmin && zoomMeeting.start_url && (
                <a
                  href={zoomMeeting.start_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-green-700 shadow-sm hover:shadow-md transition-all"
                >
                  <Monitor className="w-4 h-4" /> Start as Host
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <WifiOff className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">No Zoom meeting has been set up for this course yet.</p>
            {isInstructorOrAdmin && (
              <Button onClick={onCreateZoom} loading={zoomLoading} icon={Plus}>
                Create Permanent Zoom Meeting
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Instructors */}
      {course.instructors?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Instructors</h3>
          <div className="flex flex-wrap gap-3">
            {course.instructors.map(inst => (
              <div key={inst.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{getInitials(inst.full_name)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{inst.full_name}</p>
                  <p className="text-xs text-gray-400">{inst.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance Summary for Students */}
      {course.attendanceStats && (
        <div className="border border-gray-100 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-600" /> Your Attendance
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={course.attendanceStats.percentage >= 75 ? '#10b981' : course.attendanceStats.percentage >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3"
                  strokeDasharray={`${course.attendanceStats.percentage * 0.9425} 94.25`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
                {course.attendanceStats.percentage}%
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-700 font-medium">
                {course.attendanceStats.attended} / {course.attendanceStats.total} classes attended
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {course.attendanceStats.percentage >= 75 ? '✅ Good standing' :
                 course.attendanceStats.percentage >= 50 ? '⚠️ Needs improvement' : '❌ Low attendance'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// LIVE CLASSES TAB
// ================================================================
function LiveClassesTab({ course, zoomMeeting, sessions, recordings, isInstructorOrAdmin, role, onCreateZoom, zoomLoading, onCreateSession, onFetchAttendance, onSyncRecordings }) {
  return (
    <div className="space-y-6">
      {/* Permanent Zoom Meeting Card */}
      <div className="border-2 border-blue-100 rounded-2xl p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${zoomMeeting ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gray-200'}`}>
              <Video className={`w-6 h-6 ${zoomMeeting ? 'text-white' : 'text-gray-500'}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Permanent Course Meeting</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {zoomMeeting ? 'This Zoom link stays the same for all sessions' : 'Create a permanent Zoom meeting for this course'}
              </p>
            </div>
          </div>
          {zoomMeeting ? (
            <Badge variant="success">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" /> Active
            </Badge>
          ) : (
            <Badge variant="warning">
              <WifiOff className="w-3 h-3 mr-1" /> Not Configured
            </Badge>
          )}
        </div>

        {zoomMeeting ? (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white rounded-lg px-3 py-2 mb-3 border border-gray-100">
              <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-xs truncate flex-1 font-mono">{zoomMeeting.join_url}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
              <Shield className="w-3 h-3" />
              <span>Meeting ID: {zoomMeeting.zoom_meeting_id}</span>
              <span className="text-gray-300">•</span>
              <span>Recording: {zoomMeeting.auto_recording === 'cloud' ? '☁️ Auto Cloud' : zoomMeeting.auto_recording === 'local' ? '💻 Auto Local' : '❌ Off'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={zoomMeeting.join_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow-md transition-all"
              >
                <Video className="w-4 h-4" /> Join Zoom
              </a>
              {isInstructorOrAdmin && zoomMeeting.start_url && (
                <a
                  href={zoomMeeting.start_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-green-700 shadow-sm hover:shadow-md transition-all"
                >
                  <Monitor className="w-4 h-4" /> Start as Host
                </a>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            {isInstructorOrAdmin ? (
              <Button onClick={onCreateZoom} loading={zoomLoading} icon={Plus} size="lg">
                Create Permanent Zoom Meeting
              </Button>
            ) : (
              <p className="text-sm text-gray-500">Your instructor has not set up a Zoom meeting yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Recordings */}
      {recordings.length > 0 && (
        <div className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-red-500" /> Recordings
            </h3>
            {isInstructorOrAdmin && (
              <button onClick={onSyncRecordings} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Sync from Zoom
              </button>
            )}
          </div>
          <div className="space-y-2">
            {recordings.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Play className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 font-medium">{r.recording_type || 'Video'} Recording</p>
                  <p className="text-xs text-gray-400">{formatDateTime(r.recording_start)} • {r.duration ? `${Math.round(r.duration / 60)} min` : '—'}</p>
                </div>
                {r.play_url && (
                  <a href={r.play_url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Watch
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isInstructorOrAdmin && recordings.length === 0 && zoomMeeting && (
        <div className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">No recordings yet</span>
            </div>
            <button onClick={onSyncRecordings} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Sync from Zoom
            </button>
          </div>
        </div>
      )}

      {/* Session List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">Scheduled Sessions</h3>
          {isInstructorOrAdmin && (
            <Button icon={Plus} size="sm" onClick={onCreateSession}>Schedule Session</Button>
          )}
        </div>

        {sessions.length === 0 ? (
          <EmptyState icon={Video} title="No Sessions" description="No live sessions have been scheduled yet." />
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Video className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDateTime(s.scheduled_time)}
                    </span>
                    <span className="text-xs text-gray-400">{formatDuration(s.duration)}</span>
                    <StatusBadge status={s.status} />
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  {s.join_url && role === 'student' && (
                    <a href={s.join_url} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors">
                      Join
                    </a>
                  )}
                  {s.start_url && isInstructorOrAdmin && (
                    <a href={s.start_url} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-colors">
                      Start
                    </a>
                  )}
                  {isInstructorOrAdmin && s.zoom_meeting_id && (
                    <button onClick={() => onFetchAttendance(s.id)}
                      className="px-3 py-1.5 bg-purple-500 text-white text-xs font-semibold rounded-lg hover:bg-purple-600 transition-colors">
                      Sync Attendance
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// ASSIGNMENTS TAB
// ================================================================
function AssignmentsTab({ assignments, isInstructorOrAdmin, role, basePath, onAdd, onEdit, onDelete, onSubmit }) {
  return (
    <div className="space-y-4">
      {isInstructorOrAdmin && (
        <div className="flex justify-end">
          <Button icon={Plus} onClick={onAdd}>Create Assignment</Button>
        </div>
      )}
      {assignments.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No Assignments" description="No assignments have been created yet." />
      ) : (
        <div className="space-y-3">
          {assignments.map(a => (
            <div key={a.id} className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Due: {formatDate(a.due_date)}
                    </span>
                    {(a.attachment_name || a.attachment_path) && (
                      <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-lg">
                        <FileText className="w-3.5 h-3.5 text-red-600" />
                        <span className="text-xs font-medium text-red-700">{a.attachment_name || 'Attached PDF'}</span>
                        {a.attachment_url && (
                          <a
                            href={getPdfUrl(a.attachment_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-red-600 hover:text-red-800 ml-1 flex items-center gap-0.5 underline"
                          >
                            View PDF <Download className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  {a.mySubmission ? (
                    <StatusBadge status={a.mySubmission.status} />
                  ) : role === 'student' ? (
                    <Button size="sm" icon={Send} onClick={() => onSubmit(a)}>
                      Submit
                    </Button>
                  ) : (
                    <>
                      <Link to={`${basePath}/assignments/${a.id}/submissions`}>
                        <Button size="sm" variant="secondary">Submissions</Button>
                      </Link>
                      <button
                        onClick={() => onEdit(a)}
                        title="Edit Assignment"
                        className="p-2 text-gray-400 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(a)}
                        title="Delete Assignment"
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {a.mySubmission?.status === 'graded' && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800"><strong>Marks:</strong> {a.mySubmission.marks ?? '—'}</p>
                  {a.mySubmission.feedback && <p className="text-sm text-green-700 mt-1"><strong>Feedback:</strong> {a.mySubmission.feedback}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================================================================
// ATTENDANCE TAB
// ================================================================
function AttendanceTab({ course, sessions, isInstructorOrAdmin, onFetch, role, courseId }) {
  // Show attendance summary for students at top
  return (
    <div className="space-y-4">
      {course.attendanceStats && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-600" /> Your Attendance Summary
          </h3>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={course.attendanceStats.percentage >= 75 ? '#10b981' : course.attendanceStats.percentage >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="2.5"
                  strokeDasharray={`${course.attendanceStats.percentage * 0.9425} 94.25`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900">
                {course.attendanceStats.percentage}%
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-gray-900">
                {course.attendanceStats.attended} / {course.attendanceStats.total} classes attended
              </p>
              <p className="text-sm text-gray-500">
                {course.attendanceStats.percentage >= 75 ? '✅ Good standing' :
                 course.attendanceStats.percentage >= 50 ? '⚠️ Needs improvement' : '❌ Low attendance – please attend more classes'}
              </p>
            </div>
          </div>
        </div>
      )}

      {sessions.length === 0 ? (
        <EmptyState icon={UserCheck} title="No Sessions" description="Attendance data will appear once sessions are conducted." />
      ) : (
        sessions.map(s => (
          <AttendanceBlock key={s.id} session={s} isInstructorOrAdmin={isInstructorOrAdmin} onFetch={onFetch} />
        ))
      )}
    </div>
  );
}

// ================================================================
// MATERIALS TAB
// ================================================================
function MaterialsTab({ materials, isInstructorOrAdmin, onAdd }) {
  return (
    <div className="space-y-4">
      {isInstructorOrAdmin && (
        <div className="flex justify-end">
          <Button icon={Plus} onClick={onAdd}>Add Material</Button>
        </div>
      )}
      {materials.length === 0 ? (
        <EmptyState icon={FileText} title="No Materials" description="No learning materials have been added yet." />
      ) : (
        <div className="space-y-3">
          {materials.map(m => (
            <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{m.title}</p>
                <p className="text-xs text-gray-400 truncate">{m.description || 'No description'}</p>
              </div>
              {m.file_url && (
                <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================================================================
// STUDENTS TAB
// ================================================================
function StudentsTab({ students }) {
  if (students.length === 0) {
    return <EmptyState icon={Users} title="No Students" description="No students enrolled in this course yet." />;
  }

  return (
    <Table
      columns={[
        { header: 'Student', render: (row) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{getInitials(row.full_name)}</span>
            </div>
            <span className="font-medium">{row.full_name}</span>
          </div>
        )},
        { header: 'Email', accessor: 'email' },
      ]}
      data={students}
    />
  );
}

// ================================================================
// ATTENDANCE BLOCK (per session)
// ================================================================
function AttendanceBlock({ session, isInstructorOrAdmin, onFetch }) {
  const [attendance, setAttendance] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const loadAttendance = async () => {
    try {
      const res = await api.get(`/attendance/session/${session.id}`);
      setAttendance(res.data.attendance || []);
      setLoaded(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{session.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-400">{formatDateTime(session.scheduled_time)}</p>
            <StatusBadge status={session.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {!loaded && (
            <button onClick={loadAttendance} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors">
              View Attendance
            </button>
          )}
          {isInstructorOrAdmin && session.zoom_meeting_id && (
            <button onClick={() => onFetch(session.id)} className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-200 transition-colors">
              Sync from Zoom
            </button>
          )}
        </div>
      </div>
      {loaded && (
        attendance.length === 0 ? (
          <p className="text-xs text-gray-400">No attendance records</p>
        ) : (
          <Table
            columns={[
              { header: 'Name', render: (r) => r.profiles?.full_name || r.participant_name || 'Unknown' },
              { header: 'Join Time', render: (r) => formatDateTime(r.join_time) },
              { header: 'Leave Time', render: (r) => formatDateTime(r.leave_time) },
              { header: 'Duration', render: (r) => r.duration ? `${Math.round(r.duration / 60)} min` : '—' },
            ]}
            data={attendance}
          />
        )
      )}
    </div>
  );
}
