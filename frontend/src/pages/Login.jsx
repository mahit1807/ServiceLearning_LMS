import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Mail, Lock, GraduationCap, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login, isAuthenticated, profile, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  if (!loading && isAuthenticated && profile) {
    return <Navigate to={`/${profile.role}/dashboard`} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('Please enter both email and password');
      return;
    }

    setSubmitting(true);
    try {
      const prof = await login(email, password);
      toast.success(`Welcome back, ${prof?.full_name || 'User'}!`);
      navigate(`/${prof?.role || 'student'}/dashboard`, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel – form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 bg-white">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-saffron-500 to-saffron-600 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-gray-900">ISKCON LMS</h1>
              <p className="text-xs text-gray-400">Learning Management System</p>
            </div>
          </Link>

          <div className="mb-8">
            <h2 className="text-3xl font-bold font-display text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-500">Sign in to access your learning dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 focus:outline-none transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 text-sm focus:border-saffron-400 focus:ring-2 focus:ring-saffron-100 focus:outline-none transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-saffron-500 to-saffron-600 text-white font-semibold rounded-xl hover:from-saffron-600 hover:to-saffron-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 text-center">
              Quick Test Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@iskcon.org');
                  setPassword('Password123');
                }}
                className="py-1.5 px-2 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-medium rounded-lg border border-purple-200 transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('instructor@iskcon.org');
                  setPassword('Password123');
                }}
                className="py-1.5 px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium rounded-lg border border-blue-200 transition-colors"
              >
                Instructor
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('student@iskcon.org');
                  setPassword('Password123');
                }}
                className="py-1.5 px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium rounded-lg border border-emerald-200 transition-colors"
              >
                Student
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Database authentication verified via Mongoose & JWT
          </p>
        </div>
      </div>

      {/* Right panel – decorative */}
      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-12">
        <div className="max-w-lg text-center text-white">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-8">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold font-display mb-4">
            Structured Spiritual Education
          </h2>
          <p className="text-lg text-white/70 leading-relaxed">
            Access comprehensive courses on Bhagavad Gita, Bhakti Yoga, and Vedic Philosophy.
            Attend live sessions, submit assignments, and track your progress — all in one platform.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Courses', value: '50+' },
              { label: 'Students', value: '500+' },
              { label: 'Sessions', value: '200+' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
