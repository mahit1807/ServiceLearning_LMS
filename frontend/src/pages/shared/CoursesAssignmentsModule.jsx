import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input, Textarea, Select } from '../../components/common/Input';
import { EmptyState, CardSkeleton } from '../../components/common/EmptyState';
import { Badge, StatusBadge } from '../../components/common/Badge';
import { getInitials, formatDate } from '../../utils/helpers';
import {
  BookOpen, ClipboardList, Plus, Search, Users, UserPlus, Calendar,
  ArrowRight, Edit2, Trash2, FileText, Download, AlertTriangle, Paperclip, X
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getPdfUrl(url) {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
}

export default function CoursesAssignmentsModule() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'courses';

  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Course Modals
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(null);
  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(null);

  // Assignment Modals
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
  const [showEditAssignmentModal, setShowEditAssignmentModal] = useState(null);
  const [showDeleteAssignmentModal, setShowDeleteAssignmentModal] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(null);

  // Form states
  const [formData, setFormData] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const role = profile?.role || 'student';
  const isAdmin = role === 'admin';
  const isInstructor = role === 'instructor';
  const isStudent = role === 'student';
  const basePath = `/${role}`;

  useEffect(() => {
    loadModuleData();
    if (searchParams.get('create') === 'true') {
      setFormData({});
      setShowCreateCourseModal(true);
    }
  }, [searchParams]);

  const loadModuleData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [cRes, iRes, sRes] = await Promise.all([
          api.get('/admin/courses'),
          api.get('/admin/instructors'),
          api.get('/admin/students'),
        ]);
        const courseList = cRes.data.courses || [];
        setCourses(courseList);
        setInstructors(iRes.data.instructors || []);
        setStudents(sRes.data.students || []);

        const aPromises = courseList.map(c =>
          api.get(`/assignments/course/${c.id}`).then(r => (r.data.assignments || []).map(a => ({
            ...a,
            courseName: c.course_name,
            courseCode: c.course_code
          }))).catch(() => [])
        );
        const aResults = await Promise.all(aPromises);
        setAssignments(aResults.flat());
      } else {
        const cRes = await api.get('/courses');
        const courseList = cRes.data.courses || [];
        setCourses(courseList);

        const aPromises = courseList.map(c =>
          api.get(`/assignments/course/${c.id}`).then(r => (r.data.assignments || []).map(a => ({
            ...a,
            courseName: c.course_name || c.title,
            courseCode: c.course_code
          }))).catch(() => [])
        );
        const aResults = await Promise.all(aPromises);
        setAssignments(aResults.flat());
      }
    } catch (err) {
      console.error('Error loading courses/assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== COURSE CRUD ====================

  // Create Course
  const handleCreateCourse = async () => {
    if (!formData.course_name?.trim()) {
      toast.warning('Course name is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/admin/courses', formData);
      toast.success('Course created successfully!');
      setShowCreateCourseModal(false);
      setFormData({});
      await loadModuleData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to create course';
      toast.error(`Failed to create course: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Course
  const handleEditCourse = async () => {
    if (!formData.course_name?.trim()) {
      toast.warning('Course name is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/admin/courses/${showEditCourseModal.id}`, {
        course_name: formData.course_name,
        description: formData.description,
      });
      toast.success('Course updated successfully!');
      setShowEditCourseModal(null);
      setFormData({});
      await loadModuleData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to update course';
      toast.error(`Failed to update course: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Course
  const handleDeleteCourse = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/admin/courses/${showDeleteCourseModal.id}`);
      toast.success('Course deleted successfully!');
      setShowDeleteCourseModal(null);
      await loadModuleData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to delete course';
      toast.error(`Failed to delete course: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Assign Instructor
  const handleAssignInstructor = async () => {
    if (!formData.instructor_id) {
      toast.warning('Select an instructor');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/admin/assign-instructor', {
        course_id: showAssignModal.id,
        instructor_id: formData.instructor_id
      });
      toast.success('Instructor assigned!');
      setShowAssignModal(null);
      setFormData({});
      await loadModuleData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to assign instructor';
      toast.error(`Failed to assign instructor: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Enroll Student
  const handleEnrollStudent = async () => {
    if (!formData.student_id) {
      toast.warning('Select a student');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/admin/enroll-student', {
        course_id: showEnrollModal.id,
        student_id: formData.student_id
      });
      toast.success('Student enrolled!');
      setShowEnrollModal(null);
      setFormData({});
      await loadModuleData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to enroll student';
      toast.error(`Failed to enroll student: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== ASSIGNMENT CRUD & PDF ====================

  // Handle PDF file selection
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

  // Create Assignment
  const handleCreateAssignment = async () => {
    if (!formData.course_id || !formData.title?.trim()) {
      toast.warning('Course and Assignment Title are required');
      return;
    }

    setSubmitting(true);
    try {
      const uploadData = new FormData();
      uploadData.append('course_id', formData.course_id);
      uploadData.append('title', formData.title.trim());
      if (formData.description) uploadData.append('description', formData.description.trim());
      if (formData.due_date) uploadData.append('due_date', formData.due_date);
      if (selectedFile) uploadData.append('pdf', selectedFile);

      await api.post('/assignments', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(selectedFile ? 'Assignment created with PDF attachment!' : 'Assignment created successfully!');
      setShowCreateAssignmentModal(false);
      setFormData({});
      setSelectedFile(null);
      await loadModuleData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to create assignment';
      toast.error(`Failed to create assignment: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Assignment
  const handleEditAssignment = async () => {
    if (!formData.title?.trim()) {
      toast.warning('Assignment Title is required');
      return;
    }

    setSubmitting(true);
    try {
      const uploadData = new FormData();
      uploadData.append('title', formData.title.trim());
      if (formData.description !== undefined) uploadData.append('description', formData.description.trim());
      if (formData.due_date) uploadData.append('due_date', formData.due_date);
      if (formData.course_id) uploadData.append('course_id', formData.course_id);
      if (selectedFile) uploadData.append('pdf', selectedFile);
      if (formData.remove_attachment) uploadData.append('remove_attachment', 'true');

      await api.put(`/assignments/${showEditAssignmentModal.id}`, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Assignment updated successfully!');
      setShowEditAssignmentModal(null);
      setFormData({});
      setSelectedFile(null);
      await loadModuleData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to update assignment';
      toast.error(`Failed to update assignment: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/assignments/${showDeleteAssignmentModal.id}`);
      toast.success('Assignment deleted successfully!');
      setShowDeleteAssignmentModal(null);
      await loadModuleData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to delete assignment';
      toast.error(`Failed to delete assignment: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Assignment (Student)
  const handleSubmitAssignment = async () => {
    if (!formData.submission_text && !formData.submission_url) {
      toast.warning('Please enter submission text or link');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/assignments/${showSubmitModal.id}/submit`, formData);
      toast.success('Assignment submitted successfully!');
      setShowSubmitModal(null);
      setFormData({});
      await loadModuleData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to submit assignment';
      toast.error(`Failed to submit: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCourses = courses.filter(c =>
    (c.course_name || c.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.course_code || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredAssignments = assignments.filter(a =>
    (a.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.courseName || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.description || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <CardSkeleton count={6} />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-saffron-600" />
            Courses & Assignments
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete curriculum management, student progress tracking, and PDF study material distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(isAdmin || isInstructor) && (
            <Button icon={Plus} onClick={() => { setFormData({}); setShowCreateCourseModal(true); }}>
              Create Course
            </Button>
          )}
          {(isInstructor || isAdmin) && (
            <Button variant="secondary" icon={Plus} onClick={() => { setFormData({}); setSelectedFile(null); setShowCreateAssignmentModal(true); }}>
              Create Assignment
            </Button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setSearchParams({ tab: 'courses' })}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'courses'
                ? 'bg-saffron-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            {isAdmin ? 'All Courses' : 'My Courses'} ({courses.length})
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'assignments' })}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'assignments'
                ? 'bg-saffron-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Assignments ({assignments.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'courses' ? 'Search courses...' : 'Search assignments...'}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 focus:outline-none"
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB CONTENT: COURSES */}
      {/* ======================================================== */}
      {activeTab === 'courses' && (
        <>
          {filteredCourses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No Courses Found"
              description={search ? 'Try another search query.' : 'No courses are registered yet.'}
              action={(isAdmin || isInstructor) ? <Button icon={Plus} onClick={() => { setFormData({}); setShowCreateCourseModal(true); }}>Create Course</Button> : null}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between group">
                  <div>
                    <div className="h-2 bg-gradient-to-r from-saffron-400 to-saffron-600" />
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {course.course_code || course.id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {course.studentCount != null && (
                            <Badge variant="info">{course.studentCount} students</Badge>
                          )}
                          {(isAdmin || isInstructor) && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setFormData({
                                    course_name: course.course_name || course.title,
                                    description: course.description || '',
                                  });
                                  setShowEditCourseModal(course);
                                }}
                                title="Edit Course"
                                className="p-1.5 text-gray-400 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setShowDeleteCourseModal(course)}
                                title="Delete Course"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {course.course_name || course.title}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                        {course.description || 'No description provided'}
                      </p>

                      {/* Instructors */}
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {(course.instructors || []).length > 0 ? (
                          course.instructors.map(i => (
                            <div key={i.id || i.email} className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-lg">
                              <div className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center">
                                <span className="text-[9px] font-bold text-white">{getInitials(i.full_name)}</span>
                              </div>
                              <span className="text-xs text-purple-700 font-medium">{i.full_name}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">No instructor assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0 border-t border-gray-50 flex items-center gap-2 mt-4">
                    <Link
                      to={`${basePath}/courses/${course.id}`}
                      className="flex-1 text-center py-2.5 text-xs font-bold text-saffron-700 bg-saffron-50 rounded-xl hover:bg-saffron-100 transition-colors flex items-center justify-center gap-1"
                    >
                      View Details <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => { setFormData({}); setShowAssignModal(course); }}
                          title="Assign Instructor"
                          className="py-2.5 px-3 text-xs font-semibold text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setFormData({}); setShowEnrollModal(course); }}
                          title="Enroll Student"
                          className="py-2.5 px-3 text-xs font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* TAB CONTENT: ASSIGNMENTS */}
      {/* ======================================================== */}
      {activeTab === 'assignments' && (
        <>
          {filteredAssignments.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No Assignments Found"
              description="No assignments have been published yet."
              action={(isInstructor || isAdmin) ? (
                <Button icon={Plus} onClick={() => { setFormData({}); setSelectedFile(null); setShowCreateAssignmentModal(true); }}>
                  Create Assignment
                </Button>
              ) : null}
            />
          ) : (
            <div className="space-y-4">
              {filteredAssignments.map((a) => (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-saffron-100 flex items-center justify-center flex-shrink-0 text-saffron-600">
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div className="max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">{a.title}</h3>
                        <span className="text-xs font-mono font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {a.courseCode || a.course_id}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mt-0.5">{a.courseName}</p>
                      {a.description && (
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{a.description}</p>
                      )}

                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Due: {formatDate(a.due_date)}
                        </span>

                        {/* PDF Attachment indicator and View/Download button */}
                        {(a.attachment_name || a.attachment_path) && (
                          <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg">
                            <FileText className="w-3.5 h-3.5 text-red-600" />
                            <span className="text-xs font-medium text-red-700 truncate max-w-xs">
                              {a.attachment_name || 'Study Material PDF'}
                            </span>
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
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Student Submission Button */}
                    {a.mySubmission ? (
                      <div className="text-right">
                        <StatusBadge status={a.mySubmission.status} />
                        {a.mySubmission.marks != null && (
                          <p className="text-xs font-semibold text-green-700 mt-1">Marks: {a.mySubmission.marks}</p>
                        )}
                      </div>
                    ) : isStudent ? (
                      <Button size="sm" icon={Plus} onClick={() => { setFormData({}); setShowSubmitModal(a); }}>
                        Submit Work
                      </Button>
                    ) : null}

                    {/* Instructor / Admin actions */}
                    {(isInstructor || isAdmin) && (
                      <>
                        <Link
                          to={`${basePath}/assignments/${a.id}/submissions`}
                          className="px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                        >
                          Submissions
                        </Link>
                        <button
                          onClick={() => {
                            setFormData({
                              title: a.title,
                              description: a.description || '',
                              due_date: a.due_date ? a.due_date.slice(0, 16) : '',
                              course_id: a.course_id,
                            });
                            setSelectedFile(null);
                            setShowEditAssignmentModal(a);
                          }}
                          title="Edit Assignment"
                          className="p-2 text-gray-400 hover:text-saffron-600 hover:bg-saffron-50 rounded-xl transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteAssignmentModal(a)}
                          title="Delete Assignment"
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* Modal: Create Course */}
      <Modal
        isOpen={showCreateCourseModal}
        onClose={() => setShowCreateCourseModal(false)}
        title="Create New Course"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateCourseModal(false)}>Cancel</Button>
            <Button onClick={handleCreateCourse} loading={submitting}>Create Course</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Course Name"
            value={formData.course_name || ''}
            onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
            placeholder="e.g., Bhagavad Gita – As It Is"
            required
          />
          <Textarea
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Course overview and syllabus..."
          />
          <p className="text-xs text-gray-400">A unique 7-character course code will be generated automatically upon creation.</p>
        </div>
      </Modal>

      {/* Modal: Edit Course */}
      <Modal
        isOpen={!!showEditCourseModal}
        onClose={() => setShowEditCourseModal(null)}
        title={`Edit Course: ${showEditCourseModal?.course_name || showEditCourseModal?.title || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditCourseModal(null)}>Cancel</Button>
            <Button onClick={handleEditCourse} loading={submitting}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Course Name"
            value={formData.course_name || ''}
            onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </Modal>

      {/* Modal: Delete Course Confirmation */}
      <Modal
        isOpen={!!showDeleteCourseModal}
        onClose={() => setShowDeleteCourseModal(null)}
        title="Delete Course"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteCourseModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteCourse} loading={submitting}>Delete Course</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">This action cannot be undone.</p>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete course <strong>{showDeleteCourseModal?.course_name || showDeleteCourseModal?.title}</strong>? All associated live sessions, materials, and assignments will be safely unlinked.
          </p>
        </div>
      </Modal>

      {/* Modal: Assign Instructor */}
      <Modal
        isOpen={!!showAssignModal}
        onClose={() => setShowAssignModal(null)}
        title={`Assign Instructor: ${showAssignModal?.course_name || showAssignModal?.title || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAssignModal(null)}>Cancel</Button>
            <Button onClick={handleAssignInstructor} loading={submitting}>Assign Instructor</Button>
          </>
        }
      >
        <Select
          label="Select Instructor"
          value={formData.instructor_id || ''}
          onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
        >
          <option value="">Choose an instructor...</option>
          {instructors.map(i => <option key={i.id} value={i.id}>{i.full_name} ({i.email})</option>)}
        </Select>
      </Modal>

      {/* Modal: Enroll Student */}
      <Modal
        isOpen={!!showEnrollModal}
        onClose={() => setShowEnrollModal(null)}
        title={`Enroll Student: ${showEnrollModal?.course_name || showEnrollModal?.title || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEnrollModal(null)}>Cancel</Button>
            <Button onClick={handleEnrollStudent} loading={submitting}>Enroll Student</Button>
          </>
        }
      >
        <Select
          label="Select Student"
          value={formData.student_id || ''}
          onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
        >
          <option value="">Choose a student...</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}
        </Select>
      </Modal>

      {/* Modal: Create Assignment with PDF Upload */}
      <Modal
        isOpen={showCreateAssignmentModal}
        onClose={() => setShowCreateAssignmentModal(false)}
        title="Create New Assignment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateAssignmentModal(false)}>Cancel</Button>
            <Button onClick={handleCreateAssignment} loading={submitting}>Create Assignment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Course"
            value={formData.course_id || ''}
            onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
            required
          >
            <option value="">Select course...</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.course_name || c.title}</option>)}
          </Select>

          <Input
            label="Assignment Title"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Chapter 2 Verses 11-30 Essay"
            required
          />

          <Textarea
            label="Instructions & Guidelines"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed instructions for the students..."
          />

          <Input
            label="Due Date"
            type="datetime-local"
            value={formData.due_date || ''}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />

          {/* PDF Upload Section */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Attach PDF Material (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-saffron-300 transition-colors bg-gray-50/50">
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
                    className="p-1 text-gray-400 hover:text-red-500 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Paperclip className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-600 font-medium">
                    Upload assignment reference or question PDF
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">PDF only, max 10 MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="assignment-pdf-upload"
                  />
                  <label
                    htmlFor="assignment-pdf-upload"
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

      {/* Modal: Edit Assignment */}
      <Modal
        isOpen={!!showEditAssignmentModal}
        onClose={() => setShowEditAssignmentModal(null)}
        title={`Edit Assignment: ${showEditAssignmentModal?.title || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditAssignmentModal(null)}>Cancel</Button>
            <Button onClick={handleEditAssignment} loading={submitting}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Assignment Title"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <Textarea
            label="Instructions"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <Input
            label="Due Date"
            type="datetime-local"
            value={formData.due_date || ''}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />

          {/* Current Attachment / Replace */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">PDF Attachment</label>
            {showEditAssignmentModal?.attachment_name && !formData.remove_attachment && !selectedFile && (
              <div className="flex items-center justify-between bg-red-50/60 p-3 rounded-lg border border-red-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  <span className="text-xs font-semibold text-red-800">{showEditAssignmentModal.attachment_name}</span>
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
                    id="edit-assignment-pdf-upload"
                  />
                  <label
                    htmlFor="edit-assignment-pdf-upload"
                    className="inline-block px-3 py-1.5 text-xs font-bold text-saffron-700 bg-saffron-50 hover:bg-saffron-100 rounded-lg cursor-pointer transition-colors"
                  >
                    {showEditAssignmentModal?.attachment_name ? 'Replace PDF with New File' : 'Attach PDF File'}
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Delete Assignment Confirmation */}
      <Modal
        isOpen={!!showDeleteAssignmentModal}
        onClose={() => setShowDeleteAssignmentModal(null)}
        title="Delete Assignment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteAssignmentModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteAssignment} loading={submitting}>Delete Assignment</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">This will permanently delete this assignment and attached PDF.</p>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{showDeleteAssignmentModal?.title}</strong>?
          </p>
        </div>
      </Modal>

      {/* Modal: Submit Assignment */}
      <Modal
        isOpen={!!showSubmitModal}
        onClose={() => setShowSubmitModal(null)}
        title={`Submit: ${showSubmitModal?.title || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSubmitModal(null)}>Cancel</Button>
            <Button onClick={handleSubmitAssignment} loading={submitting}>Submit Work</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Textarea
            label="Submission Text"
            value={formData.submission_text || ''}
            onChange={(e) => setFormData({ ...formData, submission_text: e.target.value })}
            placeholder="Type your response here..."
            rows={5}
          />
          <Input
            label="Submission URL (Google Doc / Drive Link)"
            type="url"
            value={formData.submission_url || ''}
            onChange={(e) => setFormData({ ...formData, submission_url: e.target.value })}
            placeholder="https://docs.google.com/..."
          />
        </div>
      </Modal>
    </div>
  );
}
