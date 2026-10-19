import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input, Textarea, Select } from '../../components/common/Input';
import { EmptyState, CardSkeleton } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { getInitials } from '../../utils/helpers';
import { BookOpen, Plus, Search, Users, UserPlus, Edit2, Trash2, AlertTriangle } from 'lucide-react';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [coursesRes, instructorsRes, studentsRes] = await Promise.all([
        api.get('/admin/courses'),
        api.get('/admin/instructors'),
        api.get('/admin/students'),
      ]);
      setCourses(coursesRes.data.courses || []);
      setInstructors(instructorsRes.data.instructors || []);
      setStudents(studentsRes.data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!formData.course_name?.trim()) { toast.warning('Course name is required'); return; }
    setSubmitting(true);
    try {
      await api.post('/admin/courses', formData);
      toast.success('Course created successfully!');
      setShowCreateModal(false);
      setFormData({});
      loadData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to create course';
      toast.error(`Failed to create course: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCourse = async () => {
    if (!formData.course_name?.trim()) { toast.warning('Course name is required'); return; }
    setSubmitting(true);
    try {
      await api.put(`/admin/courses/${showEditModal.id}`, {
        course_name: formData.course_name.trim(),
        description: formData.description?.trim(),
      });
      toast.success('Course updated successfully!');
      setShowEditModal(null);
      setFormData({});
      loadData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to update course';
      toast.error(`Failed to update course: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/admin/courses/${showDeleteModal.id}`);
      toast.success('Course deleted successfully!');
      setShowDeleteModal(null);
      loadData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to delete course';
      toast.error(`Failed to delete course: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignInstructor = async () => {
    if (!formData.instructor_id) { toast.warning('Select an instructor'); return; }
    setSubmitting(true);
    try {
      await api.post('/admin/assign-instructor', { course_id: showAssignModal.id, instructor_id: formData.instructor_id });
      toast.success('Instructor assigned!');
      setShowAssignModal(null);
      setFormData({});
      loadData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to assign instructor';
      toast.error(`Failed to assign instructor: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnrollStudent = async () => {
    if (!formData.student_id) { toast.warning('Select a student'); return; }
    setSubmitting(true);
    try {
      await api.post('/admin/enroll-student', { course_id: showEnrollModal.id, student_id: formData.student_id });
      toast.success('Student enrolled!');
      setShowEnrollModal(null);
      setFormData({});
      loadData();
    } catch (err) {
      const details = err.response?.data?.error || err.message || 'Failed to enroll student';
      toast.error(`Failed to enroll student: ${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = courses.filter(c =>
    (c.course_name || c.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.course_code || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <CardSkeleton count={6} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">Course Management</h1>
          <p className="text-sm text-gray-500 mt-1">{courses.length} courses</p>
        </div>
        <Button icon={Plus} onClick={() => { setFormData({}); setShowCreateModal(true); }}>Create Course</Button>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No Courses" description="Create your first course to get started." action={
          <Button icon={Plus} onClick={() => { setFormData({}); setShowCreateModal(true); }}>Create Course</Button>
        } />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course) => (
            <div key={course.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group flex flex-col justify-between">
              <div>
                <div className="h-2 bg-gradient-to-r from-saffron-400 to-saffron-600" />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">{course.course_code}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="info">{course.studentCount} students</Badge>
                      <button
                        onClick={() => {
                          setFormData({ course_name: course.course_name || course.title, description: course.description || '' });
                          setShowEditModal(course);
                        }}
                        title="Edit Course"
                        className="p-1.5 text-gray-400 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(course)}
                        title="Delete Course"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{course.course_name || course.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{course.description || 'No description'}</p>

                  {/* Instructors */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {(course.instructors || []).length > 0 ? (
                      course.instructors.map(i => (
                        <div key={i.id} className="flex items-center gap-2 bg-purple-50 px-2 py-1 rounded-lg">
                          <div className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">{getInitials(i.full_name)}</span>
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

              <div className="flex gap-2 border-t border-gray-50 p-6 pt-3">
                <Link to={`/admin/courses/${course.id}`} className="flex-1 text-center py-2 text-xs font-semibold text-saffron-600 bg-saffron-50 rounded-lg hover:bg-saffron-100 transition-colors">
                  View Details
                </Link>
                <button onClick={() => { setFormData({}); setShowAssignModal(course); }} title="Assign Instructor" className="py-2 px-3 text-xs font-semibold text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setFormData({}); setShowEnrollModal(course); }} title="Enroll Student" className="py-2 px-3 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <Users className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Course" footer={
        <><Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
        <Button onClick={handleCreateCourse} loading={submitting}>Create Course</Button></>
      }>
        <div className="space-y-4">
          <Input label="Course Name" value={formData.course_name || ''} onChange={(e) => setFormData({ ...formData, course_name: e.target.value })} placeholder="e.g., Bhagavad Gita – As It Is" required />
          <Textarea label="Description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Course description..." />
          <p className="text-xs text-gray-400">A unique 7-character course code will be generated automatically.</p>
        </div>
      </Modal>

      {/* Edit Course Modal */}
      <Modal isOpen={!!showEditModal} onClose={() => setShowEditModal(null)} title={`Edit Course: ${showEditModal?.course_name || showEditModal?.title || ''}`} footer={
        <><Button variant="secondary" onClick={() => setShowEditModal(null)}>Cancel</Button>
        <Button onClick={handleEditCourse} loading={submitting}>Save Changes</Button></>
      }>
        <div className="space-y-4">
          <Input label="Course Name" value={formData.course_name || ''} onChange={(e) => setFormData({ ...formData, course_name: e.target.value })} required />
          <Textarea label="Description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
        </div>
      </Modal>

      {/* Delete Course Modal */}
      <Modal isOpen={!!showDeleteModal} onClose={() => setShowDeleteModal(null)} title="Delete Course" footer={
        <><Button variant="secondary" onClick={() => setShowDeleteModal(null)}>Cancel</Button>
        <Button variant="danger" onClick={handleDeleteCourse} loading={submitting}>Delete Course</Button></>
      }>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">This action cannot be undone.</p>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete course <strong>{showDeleteModal?.course_name || showDeleteModal?.title}</strong>? All associated sessions and assignments will be safely cleaned up.
          </p>
        </div>
      </Modal>

      {/* Assign Instructor Modal */}
      <Modal isOpen={!!showAssignModal} onClose={() => setShowAssignModal(null)} title={`Assign Instructor to ${showAssignModal?.course_name || showAssignModal?.title || ''}`} footer={
        <><Button variant="secondary" onClick={() => setShowAssignModal(null)}>Cancel</Button>
        <Button onClick={handleAssignInstructor} loading={submitting}>Assign Instructor</Button></>
      }>
        <Select label="Select Instructor" value={formData.instructor_id || ''} onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}>
          <option value="">Choose an instructor...</option>
          {instructors.map(i => <option key={i.id} value={i.id}>{i.full_name} ({i.email})</option>)}
        </Select>
      </Modal>

      {/* Enroll Student Modal */}
      <Modal isOpen={!!showEnrollModal} onClose={() => setShowEnrollModal(null)} title={`Enroll Student in ${showEnrollModal?.course_name || showEnrollModal?.title || ''}`} footer={
        <><Button variant="secondary" onClick={() => setShowEnrollModal(null)}>Cancel</Button>
        <Button onClick={handleEnrollStudent} loading={submitting}>Enroll Student</Button></>
      }>
        <Select label="Select Student" value={formData.student_id || ''} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}>
          <option value="">Choose a student...</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}
        </Select>
      </Modal>
    </div>
  );
}
