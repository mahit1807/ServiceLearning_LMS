import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { EmptyState, PageLoader } from '../../components/common/EmptyState';
import { StatusBadge } from '../../components/common/Badge';
import { formatDate } from '../../utils/helpers';
import { ClipboardList, Calendar, FileText, Download } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
function getPdfUrl(url) {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
}

export default function Assignments() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const coursesRes = await api.get('/courses');
      const courseList = coursesRes.data.courses || [];
      setCourses(courseList);

      const assignmentPromises = courseList.map(c =>
        api.get(`/assignments/course/${c.id}`).then(r => (r.data.assignments || []).map(a => ({
          ...a,
          courseName: c.course_name || c.title,
          courseCode: c.course_code
        }))).catch(() => [])
      );
      const results = await Promise.all(assignmentPromises);
      setAllAssignments(results.flat());
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
        <h1 className="text-2xl font-bold font-display text-gray-900">Assignments</h1>
        <p className="text-sm text-gray-500 mt-1">{allAssignments.length} assignment{allAssignments.length !== 1 ? 's' : ''}</p>
      </div>

      {allAssignments.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No Assignments" description="No assignments found for your courses." />
      ) : (
        <div className="space-y-4">
          {allAssignments.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-saffron-100 flex items-center justify-center flex-shrink-0 text-saffron-600">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{a.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{a.courseName} ({a.courseCode})</p>
                    {a.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{a.description}</p>}
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
                </div>
                <div className="flex-shrink-0">
                  {a.mySubmission ? (
                    <div className="text-right">
                      <StatusBadge status={a.mySubmission.status} />
                      {a.mySubmission.marks != null && (
                        <p className="text-xs text-gray-500 mt-1">Marks: {a.mySubmission.marks}</p>
                      )}
                    </div>
                  ) : profile?.role === 'student' ? (
                    <StatusBadge status="pending" />
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
