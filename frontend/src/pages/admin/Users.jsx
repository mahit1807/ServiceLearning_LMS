import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import { Modal, ConfirmModal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Table } from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { EmptyState, PageLoader } from '../../components/common/EmptyState';
import { getInitials, formatDate } from '../../utils/helpers';
import { Users, Search, Plus, Trash2, UserPlus, Filter } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(null); // 'student' | 'instructor' | 'admin'
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.warning('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = showCreateModal === 'instructor' ? '/admin/create-instructor'
        : showCreateModal === 'admin' ? '/admin/create-admin'
        : '/admin/create-student';
      await api.post(endpoint, formData);
      toast.success(`${showCreateModal.charAt(0).toUpperCase() + showCreateModal.slice(1)} created successfully!`);
      setShowCreateModal(null);
      setFormData({ email: '', password: '', full_name: '' });
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/admin/delete-admin/${showDeleteModal.id}`);
      toast.success('Admin deleted successfully');
      setShowDeleteModal(null);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete admin');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  if (loading) return <PageLoader />;

  const roleBadgeVariant = (role) => role === 'admin' ? 'danger' : role === 'instructor' ? 'purple' : 'info';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} total users</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button icon={UserPlus} onClick={() => setShowCreateModal('student')} variant="secondary" size="sm">Student</Button>
          <Button icon={UserPlus} onClick={() => setShowCreateModal('instructor')} variant="secondary" size="sm">Instructor</Button>
          <Button icon={UserPlus} onClick={() => setShowCreateModal('admin')} size="sm">Admin</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {['all', 'student', 'instructor', 'admin'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
                roleFilter === r ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users table */}
      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No Users Found" description="Try adjusting your search or filters." />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Table
            columns={[
              { header: 'User', render: (row) => (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">{getInitials(row.full_name)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{row.full_name}</p>
                    <p className="text-xs text-gray-400">{row.email}</p>
                  </div>
                </div>
              )},
              { header: 'Role', render: (row) => <Badge variant={roleBadgeVariant(row.role)}>{row.role}</Badge> },
              { header: 'Created', render: (row) => <span className="text-gray-500">{formatDate(row.created_at)}</span> },
              { header: 'Actions', render: (row) => row.role === 'admin' ? (
                <button onClick={() => setShowDeleteModal(row)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : null },
            ]}
            data={filtered}
          />
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={!!showCreateModal}
        onClose={() => setShowCreateModal(null)}
        title={`Create ${showCreateModal ? showCreateModal.charAt(0).toUpperCase() + showCreateModal.slice(1) : ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(null)}>Cancel</Button>
            <Button onClick={handleCreate} loading={submitting}>Create User</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Enter full name" required />
          <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Enter email" required />
          <Input label="Password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Enter password" required />
        </div>
      </Modal>

      {/* Delete Admin Confirm */}
      <ConfirmModal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={handleDeleteAdmin}
        title="Delete Admin"
        message={`Are you sure you want to delete admin "${showDeleteModal?.full_name}"? This action cannot be undone.`}
        confirmText="Delete Admin"
        loading={submitting}
      />
    </div>
  );
}
