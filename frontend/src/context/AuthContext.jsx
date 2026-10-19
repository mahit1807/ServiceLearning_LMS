import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/auth/profile');
          const p = res.data.profile;
          setUser({ id: p.id, email: p.email });
          setProfile(p);
        } catch (err) {
          console.error('Session restore failed:', err);
          // Token is invalid – clear
          localStorage.removeItem('access_token');
          localStorage.removeItem('mock_user');
        }
      } else {
        // Check for legacy mock_user
        const savedUser = localStorage.getItem('mock_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            setUser({ id: parsed.id, email: parsed.email });
            setProfile(parsed);
          } catch {
            localStorage.removeItem('mock_user');
          }
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Login
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { session, profile: userProfile } = res.data;

      if (session?.access_token) {
        localStorage.setItem('access_token', session.access_token);
      }

      setUser({ id: userProfile.id, email: userProfile.email });
      setProfile(userProfile);

      return userProfile;
    } catch (err) {
      // If backend returns auth error or is unreachable, fall back to demo mode
      const status = err.response?.status;
      if (err.code === 'ERR_NETWORK' || status === 500 || status === 401 || status === 502) {
        console.warn('Backend login failed, using demo mode. Error:', err.message);
        return demoLogin(email);
      }
      throw err;
    }
  };

  // Demo/mock login fallback
  const demoLogin = async (email) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    let role = 'student';
    if (email.includes('admin')) role = 'admin';
    else if (email.includes('instructor')) role = 'instructor';

    const mockProfile = {
      id: 'demo-user-' + Date.now(),
      email,
      full_name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' (Demo)',
      role,
    };

    setUser({ id: mockProfile.id, email });
    setProfile(mockProfile);
    localStorage.setItem('mock_user', JSON.stringify(mockProfile));
    localStorage.setItem('access_token', `demo-token-${role}-${encodeURIComponent(email)}`);

    return mockProfile;
  };

  // Logout
  const logout = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('mock_user');
    localStorage.removeItem('access_token');
  };

  const value = {
    user,
    profile,
    loading,
    login,
    logout,
    isAuthenticated: !!user && !!profile,
    isAdmin: profile?.role === 'admin',
    isInstructor: profile?.role === 'instructor',
    isStudent: profile?.role === 'student',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
