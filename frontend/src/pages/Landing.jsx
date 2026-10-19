import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, BookOpen, Video, ClipboardList, UserCheck, Shield,
  BarChart3, ArrowRight, ChevronRight, Sparkles
} from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: 'Structured Learning',
    description: 'Comprehensive course management with organized materials, curriculum tracking, and progressive learning paths.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Video,
    title: 'Live Zoom Classes',
    description: 'Seamlessly integrated Zoom sessions for interactive live classes with one-click join capability.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: ClipboardList,
    title: 'Assignment Management',
    description: 'Create, submit, and grade assignments with due date tracking, status badges, and feedback system.',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: UserCheck,
    title: 'Attendance Tracking',
    description: 'Automatic Zoom attendance synchronization with detailed reports and participation analytics.',
    color: 'from-orange-500 to-orange-600',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'Secure authentication with Student, Instructor, and Admin roles, each with tailored dashboards.',
    color: 'from-red-500 to-red-600',
  },
  {
    icon: BarChart3,
    title: 'Admin & Reports',
    description: 'Comprehensive admin dashboard with system statistics, user management, and detailed reporting.',
    color: 'from-cyan-500 to-cyan-600',
  },
];

export default function Landing() {
  const { isAuthenticated, profile } = useAuth();

  const dashboardPath = isAuthenticated ? `/${profile?.role}/dashboard` : '/login';

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron-500 to-saffron-600 flex items-center justify-center shadow-md">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold font-display text-gray-900">ISKCON LMS</span>
            </div>

            <Link
              to={dashboardPath}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-saffron-500 to-saffron-600 text-white text-sm font-semibold rounded-xl hover:from-saffron-600 hover:to-saffron-700 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {isAuthenticated ? 'Dashboard' : 'Login to LMS'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-saffron-100/50 to-transparent rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-100/30 to-transparent rounded-full translate-y-1/3 -translate-x-1/3" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-saffron-50 rounded-full text-saffron-700 text-sm font-medium mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Spiritual Education Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-display text-gray-900 leading-tight mb-6 animate-slide-up">
            ISKCON Learning
            <br />
            <span className="text-gradient">Management System</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            A comprehensive digital platform for structured spiritual education.
            Manage courses, attend live Zoom classes, track assignments, and monitor
            attendance — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link
              to={dashboardPath}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-saffron-500 to-saffron-600 text-white text-lg font-semibold rounded-2xl hover:from-saffron-600 hover:to-saffron-700 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Login to LMS'}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-4 text-gray-600 text-lg font-medium rounded-2xl hover:bg-gray-50 transition-all duration-200"
            >
              Explore Features
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              A complete learning management system designed for spiritual education with modern tools and seamless integrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-12 sm:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-saffron-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold font-display text-white mb-4">
                Begin Your Learning Journey
              </h2>
              <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
                Join the ISKCON Learning Management System and access structured spiritual education from anywhere in the world.
              </p>
              <Link
                to={dashboardPath}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-saffron-500 to-saffron-600 text-white text-lg font-semibold rounded-2xl hover:from-saffron-600 hover:to-saffron-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-saffron-500 to-saffron-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold font-display text-gray-900">ISKCON LMS</span>
          </div>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} ISKCON Learning Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
