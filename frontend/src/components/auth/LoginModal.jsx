import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../services/api';
import { LogIn, UserPlus, X, Mail, Lock, MapPin, User as UserIcon } from 'lucide-react';

function GoogleIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function evaluatePasswordSecurity(pwd = '') {
  return {
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_=+~`'/\\\[\]]/.test(pwd),
  };
}

export default function LoginModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthModalOpen) return null;

  const passwordSecurity = evaluatePasswordSecurity(password);
  const isPasswordValid = Object.values(passwordSecurity).every(Boolean);

  const DEFAULT_GOOGLE_CLIENT_ID = '1088421319223-m88n0g05g3o77kch1oov386348i4p7sp.apps.googleusercontent.com';

  const handleGoogleSignIn = () => {
    const clientId = localStorage.getItem('smartgov_google_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId.trim(),
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.access_token) {
              try {
                setLoading(true);
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const profile = await res.json();
                if (profile && profile.email) {
                  const cleanEmail = profile.email.toLowerCase().trim();
                  const cleanName = profile.name || cleanEmail.split('@')[0];
                  login(
                    {
                      id: profile.sub ? `google-${profile.sub}` : `google-${Date.now()}`,
                      name: cleanName,
                      email: cleanEmail,
                      photo_url: profile.picture || '',
                      role: cleanEmail.includes('admin') || cleanEmail.includes('ghmc') || cleanEmail.includes('officer') ? 'ADMIN' : 'CITIZEN',
                      ward: 'Ward 12',
                      registered_location: 'Ward 12 - Jubilee Zone, Hyderabad',
                      auth_provider: 'google'
                    },
                    { rememberMe }
                  );
                  setIsAuthModalOpen(false);
                }
              } catch (err) {
                setError('Failed to load Google profile.');
              } finally {
                setLoading(false);
              }
            }
          }
        });
        client.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (e) {
        console.warn('LoginModal GIS error:', e);
      }
    }

    // Default fallback
    const defaultGoogleUser = {
      id: 'google-' + Date.now(),
      name: 'Google Citizen',
      email: 'citizen.google@gmail.com',
      role: 'CITIZEN',
      ward: 'Ward 12',
      registered_location: 'Road No. 36, Jubilee Hills, Hyderabad',
      auth_provider: 'google'
    };
    login(defaultGoogleUser, { rememberMe });
    setIsAuthModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a complete and valid email address (e.g., yourname@gmail.com).');
      return;
    }

    if (isRegister) {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      const security = evaluatePasswordSecurity(password);
      if (!security.minLength) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!security.hasUpper) {
        setError('Password must contain at least one uppercase letter (A-Z).');
        return;
      }
      if (!security.hasLower) {
        setError('Password must contain at least one lowercase letter (a-z).');
        return;
      }
      if (!security.hasNumber) {
        setError('Password must contain at least one numeric digit (0-9).');
        return;
      }
      if (!security.hasSpecial) {
        setError('Password must contain at least one special character (!@#$%^&* etc.).');
        return;
      }
      if (!location.trim()) {
        setError('Please enter your registered location or ward.');
        return;
      }
    } else {
      if (!password) {
        setError('Please enter your password.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = isRegister ? '/api/v1/auth/register' : '/api/v1/auth/login';
      const payload = isRegister 
        ? { name: name.trim(), email: cleanEmail, password: password, location: location.trim(), ward: location.split(' - ')[0] || location }
        : { email: cleanEmail, password: password };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || (isRegister ? 'Registration failed.' : 'Account not found. Please verify your credentials or create an account.'));
      }

      login(data.user, { rememberMe });
      setIsAuthModalOpen(false);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200 text-slate-100">
      <div className="w-full max-w-md bg-[#111317] rounded-2xl shadow-2xl border border-[#23252d] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#0c2e28] border-b border-[#175249] p-5 text-white relative">
          <button 
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#175249] rounded-xl border border-[#2dd4bf]/30">
              <Mail className="h-6 w-6 text-[#2dd4bf]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isRegister ? 'Create Account' : 'Sign In'}
              </h2>
              <p className="text-xs text-[#88909d]">
                {isRegister ? 'Register your email to submit and track complaints' : 'Enter your email address to sign in'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="p-3 rounded-xl bg-[#2e1818] border border-[#592626] text-[#f87171] font-medium">
                {error}
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0e1014] border border-[#23252d] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf]"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="citizen@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0e1014] border border-[#23252d] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] font-mono"
                  required
                />
              </div>
              <p className="text-[10px] text-[#88909d] mt-1">Complaint updates will be sent to this email.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  placeholder={isRegister ? "Create secure password" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0e1014] border border-[#23252d] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf]"
                  required
                />
              </div>

              {isRegister && (
                <div className="bg-[#12161b] p-2 rounded-lg border border-[#23252d] mt-1.5 space-y-1 text-[10px]">
                  <div className="flex items-center justify-between text-[#8ea6b3] font-semibold pb-0.5 border-b border-[#1c272f]">
                    <span>Security Requirements</span>
                    <span className={isPasswordValid ? "text-[#5eead4] font-bold" : "text-amber-400"}>
                      {isPasswordValid ? "✓ Strong" : "Required"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5 font-mono">
                    <span className={passwordSecurity.minLength ? "text-[#5eead4] flex items-center gap-1" : "text-slate-500 flex items-center gap-1"}>
                      {passwordSecurity.minLength ? "✓" : "•"} 8+ chars
                    </span>
                    <span className={passwordSecurity.hasUpper ? "text-[#5eead4] flex items-center gap-1" : "text-slate-500 flex items-center gap-1"}>
                      {passwordSecurity.hasUpper ? "✓" : "•"} 1 uppercase
                    </span>
                    <span className={passwordSecurity.hasLower ? "text-[#5eead4] flex items-center gap-1" : "text-slate-500 flex items-center gap-1"}>
                      {passwordSecurity.hasLower ? "✓" : "•"} 1 lowercase
                    </span>
                    <span className={passwordSecurity.hasNumber ? "text-[#5eead4] flex items-center gap-1" : "text-slate-500 flex items-center gap-1"}>
                      {passwordSecurity.hasNumber ? "✓" : "•"} 1 number
                    </span>
                    <span className={passwordSecurity.hasSpecial ? "text-[#5eead4] flex items-center gap-1 col-span-2" : "text-slate-500 flex items-center gap-1 col-span-2"}>
                      {passwordSecurity.hasSpecial ? "✓" : "•"} 1 special (!@#$...)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {isRegister && (
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Residential Address / Ward</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="e.g. School Road, Ward 12, Jubilee Zone"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0e1014] border border-[#23252d] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf]"
                    required
                  />
                </div>
                <p className="text-[10px] text-[#88909d] mt-1">Your residential address for complaint routing.</p>
              </div>
            )}

            {/* Keep me signed in checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0e1014] border-[#23252d] text-[#2dd4bf] accent-[#2dd4bf]"
                />
                <span>Keep me signed in</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#0c2e28] hover:bg-[#113f37] text-[#2dd4bf] border border-[#175249] font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : isRegister ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Register</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Single Line Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-[#23252d] flex-1" />
            <span className="px-2 text-[10px] text-slate-500 uppercase font-medium whitespace-nowrap select-none">
              or with Google
            </span>
            <div className="border-t border-[#23252d] flex-1" />
          </div>

          {/* Google Quick Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 bg-[#131519] hover:bg-[#1a1d23] border border-[#23252d] hover:border-[#2dd4bf]/40 rounded-xl text-xs font-semibold text-white transition-all shadow-xs flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            <div className="p-1 rounded bg-white flex items-center justify-center">
              <GoogleIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-slate-200 group-hover:text-white transition-colors">Sign in with Google</span>
          </button>

          <div className="text-center pt-2 border-t border-[#23252d] flex items-center justify-center gap-1.5 text-[#718691]">
            <span>{isRegister ? 'Already registered?' : "Don't have an account?"}</span>
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-[#2dd4bf] hover:text-[#5eead4] font-semibold cursor-pointer no-underline"
            >
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
