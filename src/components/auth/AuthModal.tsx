'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { X, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuthModal } from '@/context/AuthModalContext';
import { useAuth } from '@/hooks/useAuth';

// New image URLs from R2
const SIGNUP_IMAGE = 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/b53446f00bc4708f5f7649f044d8afc3.jpg';
const LOGIN_IMAGE = 'https://pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev/Assets/premium-modal-banner.e1d43302.webp';

// Google Icon
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);


export default function AuthModal() {
  const { mode, close, switchToLogin, switchToRegister } = useAuthModal();
  const { login, register, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && mode) {
      close();
    }
  }, [isAuthenticated, mode, close]);

  useEffect(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    setIsLoading(false);
  }, [mode]);

  useEffect(() => {
    if (!mode) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [mode, close]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) close();
    },
    [close]
  );

  const handleOAuthLogin = (provider: 'google') => {
    setIsLoading(true);
    window.location.href = `/api/auth/${provider}`;
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || 'Login failed');
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (password.length < 8 || !hasUppercase || !hasLowercase || !hasNumber) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and a number');
      return;
    }

    setIsLoading(true);
    const result = await register(email, password);

    if (!result.success) {
      setError(result.error || 'Registration failed');
      setIsLoading(false);
    }
  };

  if (!mode) return null;

  const isLogin = mode === 'login';
  const imageUrl = isLogin ? LOGIN_IMAGE : SIGNUP_IMAGE;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleBackdropClick}
    >
      {/* Modal Container - Two Column Flex */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          maxWidth: '900px',
          backgroundColor: '#1a1a2e',
          borderRadius: '16px',
          display: 'flex',
        }}
      >
        {/* Close Button */}
        <button
          onClick={close}
          className="absolute top-3 right-3 z-20 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT - Image */}
        <div
          className="auth-modal-image relative"
          style={{
            width: '380px',
            flexShrink: 0,
            minHeight: '580px',
            backgroundColor: '#2a2a3a',
          }}
        >
          <img
            src={imageUrl}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '16px 0 0 16px',
            }}
            onError={(e) => {
              console.error('Image failed to load:', imageUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* RIGHT - Form */}
        <div className="p-8 flex flex-col justify-center" style={{ flex: 1, minHeight: '580px' }}>
          {/* Header */}
          <h2 className="text-2xl font-bold text-white mb-1">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {isLogin ? 'Sign in to continue your journey' : 'Join us and start your AI experience'}
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={isLogin ? handleLoginSubmit : handleRegisterSubmit}>
            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:opacity-50"
                  style={{ backgroundColor: '#252538', border: '1px solid #3a3a4f' }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-1">
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:opacity-50"
                  style={{ backgroundColor: '#252538', border: '1px solid #3a3a4f' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <p className="text-xs text-gray-500 mb-4">
                Must be at least 8 characters with uppercase, lowercase, and a number
              </p>
            )}
            {isLogin && <div className="mb-4" />}

            {/* Confirm Password */}
            {!isLogin && (
              <div className="mb-5">
                <label className="block text-sm text-gray-400 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:opacity-50"
                    style={{ backgroundColor: '#252538', border: '1px solid #3a3a4f' }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: '#ec4899' }}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Free Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid #3a3a4f' }} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 text-gray-500" style={{ backgroundColor: '#1a1a2e' }}>
                or continue with
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
            >
              <GoogleIcon />
              <span>Google</span>
            </button>
          </div>

          {/* Terms */}
          {!isLogin && (
            <p className="mt-4 text-xs text-gray-500 text-center">
              By signing up, you agree to{' '}
              <a href="/terms" className="text-pink-500 hover:underline">Terms of Service</a>
            </p>
          )}

          {/* Switch */}
          <p className="mt-4 text-center text-gray-400 text-sm">
            {isLogin ? (
              <>
                Don&apos;t have an account?{' '}
                <button type="button" onClick={switchToRegister} className="text-pink-500 hover:text-pink-400 font-medium">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={switchToLogin} className="text-pink-500 hover:text-pink-400 font-medium">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Mobile responsive styles */}
      <style jsx>{`
        @media (max-width: 900px) {
          .auth-modal-image {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
