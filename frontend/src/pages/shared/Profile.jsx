import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../lib/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { getInitials, formatDate } from '../../utils/helpers';
import { User, Mail, Calendar, Shield, Save } from 'lucide-react';

export default function Profile() {
  const { profile } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', { full_name: fullName });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const roleBadge = profile?.role === 'admin' ? 'danger' : profile?.role === 'instructor' ? 'purple' : 'info';

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold font-display text-gray-900">My Profile</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-saffron-500 to-saffron-600 p-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">{getInitials(profile?.full_name)}</span>
          </div>
          <h2 className="text-xl font-bold text-white">{profile?.full_name}</h2>
          <p className="text-saffron-100 text-sm mt-1">{profile?.email}</p>
        </div>

        {/* Details */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-900">{profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Role</p>
                <Badge variant={roleBadge}>{profile?.role}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Member Since</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(profile?.created_at)}</p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
            <Input
              label="Full Name"
              icon={User}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Button icon={Save} onClick={handleSave} loading={saving}>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
