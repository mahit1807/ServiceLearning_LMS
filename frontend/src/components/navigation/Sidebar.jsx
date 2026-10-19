import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SIDEBAR_ITEMS } from '../../utils/constants';
import {
  LayoutDashboard, BookOpen, ClipboardList, Video, UserCheck, User, Users,
  Settings, LogOut, Menu, X, ChevronLeft, GraduationCap
} from 'lucide-react';

const iconMap = {
  LayoutDashboard, BookOpen, ClipboardList, Video, UserCheck, User, Users, Settings,
};

export default function Sidebar({ isOpen, onToggle }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role || 'student';
  const items = SIDEBAR_ITEMS[role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 bg-white border-r border-gray-100 shadow-sm sidebar-transition flex flex-col
          ${isOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron-500 to-saffron-600 flex items-center justify-center shadow-md flex-shrink-0">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          {isOpen && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-gray-900 font-display whitespace-nowrap">ISKCON LMS</h1>
            </div>
          )}
          <button
            onClick={onToggle}
            className="ml-auto p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          <div className="space-y-1">
            {items.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-saffron-50 text-saffron-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                    ${!isOpen ? 'lg:justify-center lg:px-2' : ''}`
                  }
                  onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isOpen && <span className="whitespace-nowrap">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User info & logout */}
        <div className="border-t border-gray-100 p-3 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ${
              !isOpen ? 'lg:justify-center lg:px-2' : ''
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
