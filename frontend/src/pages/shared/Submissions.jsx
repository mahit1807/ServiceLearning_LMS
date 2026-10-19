import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../lib/api';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input, Textarea } from '../../components/common/Input';
import { Table } from '../../components/common/Table';
import { StatusBadge } from '../../components/common/Badge';
import { EmptyState, PageLoader } from '../../components/common/EmptyState';
import { formatDateTime, getInitials } from '../../utils/helpers';
import { ArrowLeft, ClipboardList, Star, ExternalLink } from 'lucide-react';

export default function Submissions() {
  const { assignmentId } = useParams();
  const { profile } = useAuth();
  const toast = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGradeModal, setShowGradeModal] = useState(null);
  const [gradeData, setGradeData] = useState({ marks: '', feedback: '' });
  const [submitting, setSubmitting] = useState(false);
  const basePath = `/${profile?.role}`;

  useEffect(() => {
    loadSubmissions();
  }, [assignmentId]);

  const loadSubmissions = async () => {
    try {
      const res = await api.get(`/assignments/${assignmentId}/submissions`);
      setSubmissions(res.data.submissions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    setSubmitting(true);
    try {
      await api.put(`/assignments/${assignmentId}/grade/${showGradeModal.id}`, gradeData);
      toast.success('Submission graded successfully!');
      setShowGradeModal(null);
      setGradeData({ marks: '', feedback: '' });
      loadSubmissions();
    } catch (err) {
      toast.error('Failed to grade submission');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to={`${basePath}/assignments`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Assignments
      </Link>

      <div>
        <h1 className="text-2xl font-bold font-display text-gray-900">Submissions</h1>
        <p className="text-sm text-gray-500 mt-1">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
      </div>

      {submissions.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No Submissions" description="No students have submitted this assignment yet." />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Table
            columns={[
              { header: 'Student', render: (r) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{getInitials(r.profiles?.full_name)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{r.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{r.profiles?.email}</p>
                  </div>
                </div>
              )},
              { header: 'Submitted', render: (r) => formatDateTime(r.submitted_at) },
              { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { header: 'Marks', render: (r) => r.marks != null ? r.marks : '—' },
              { header: 'Submission', render: (r) => (
                <div className="flex gap-2">
                  {r.submission_url && (
                    <a href={r.submission_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {r.submission_text && <span className="text-xs text-gray-500 truncate max-w-[200px]">{r.submission_text}</span>}
                </div>
              )},
              { header: 'Action', render: (r) => (
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Star}
                  onClick={() => { setShowGradeModal(r); setGradeData({ marks: r.marks || '', feedback: r.feedback || '' }); }}
                >
                  Grade
                </Button>
              )},
            ]}
            data={submissions}
          />
        </div>
      )}

      {/* Grade Modal */}
      <Modal
        isOpen={!!showGradeModal}
        onClose={() => setShowGradeModal(null)}
        title={`Grade: ${showGradeModal?.profiles?.full_name || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowGradeModal(null)}>Cancel</Button>
            <Button onClick={handleGrade} loading={submitting}>Save Grade</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Marks"
            type="number"
            value={gradeData.marks}
            onChange={(e) => setGradeData({ ...gradeData, marks: e.target.value })}
            placeholder="e.g., 85"
          />
          <Textarea
            label="Feedback"
            value={gradeData.feedback}
            onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
            placeholder="Provide feedback to the student..."
          />
        </div>
      </Modal>
    </div>
  );
}
