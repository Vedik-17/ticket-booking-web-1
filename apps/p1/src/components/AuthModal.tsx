'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, Phone, User, CheckCircle2 } from 'lucide-react';
import { ReservaLogo } from './ReservaLogo';
import { GlassButton } from '@firefly/ui';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: { name: string; email: string; phone: string }) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      if (!fullName.trim() || !identifier.trim() || !phone.trim()) {
        setError('Please fill in all required fields.');
        setLoading(false);
        return;
      }
    } else {
      if (!identifier.trim() || !password.trim()) {
        setError('Please enter your email or phone and password.');
        setLoading(false);
        return;
      }
    }

    setTimeout(() => {
      setLoading(false);
      const user = {
        name: fullName || (identifier.includes('@') ? identifier.split('@')[0] : 'Attendee'),
        email: identifier.includes('@') ? identifier : `${phone || 'user'}@reserva.app`,
        phone: phone || (identifier.match(/^[0-9+]+$/) ? identifier : '9876543210'),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('reserva_user_profile', JSON.stringify(user));
      }

      if (onSuccess) onSuccess(user);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-[#F0E6E8] space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#8E8E93] hover:text-[#1A1A1A] rounded-full hover:bg-[#FDF2F4] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="flex justify-center">
            <ReservaLogo size="lg" showSubtitle={false} />
          </div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">
            {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p className="text-xs text-[#666666]">
            {mode === 'login'
              ? 'Log in to continue booking and manage your passes.'
              : 'Sign up to discover exclusive events and fast checkout.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-[#8E8E93]" />
                <input
                  type="text"
                  placeholder="e.g. Vedik Reddy"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E5D7DA] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#6B1736] focus:ring-1 focus:ring-[#6B1736]/20"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
              Email or Mobile
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-[#8E8E93]" />
              <input
                type="text"
                placeholder="name@email.com or phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E5D7DA] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#6B1736] focus:ring-1 focus:ring-[#6B1736]/20"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                Phone Number (+91)
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 w-4 h-4 text-[#8E8E93]" />
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E5D7DA] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#6B1736] focus:ring-1 focus:ring-[#6B1736]/20"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                Password
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => alert('Password reset link sent to your registered email/phone.')}
                  className="text-[11px] text-[#6B1736] font-semibold hover:underline"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-[#8E8E93]" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E5D7DA] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#6B1736] focus:ring-1 focus:ring-[#6B1736]/20"
              />
            </div>
          </div>

          <GlassButton
            type="submit"
            variant="primary"
            fullWidth
            size="md"
            isLoading={loading}
            className="mt-2"
          >
            {mode === 'login' ? 'Log In' : 'Create Account'}
          </GlassButton>
        </form>

        {/* Social Login Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-center">
            <div className="flex-1 h-[1px] bg-[#F0E6E8]" />
            <span className="text-[10px] text-[#8E8E93] uppercase font-semibold">Or continue with</span>
            <div className="flex-1 h-[1px] bg-[#F0E6E8]" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                const user = { name: 'Google User', email: 'user@gmail.com', phone: '9876543210' };
                localStorage.setItem('reserva_user_profile', JSON.stringify(user));
                if (onSuccess) onSuccess(user);
                onClose();
              }}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#E5D7DA] text-xs font-semibold text-[#333333] hover:bg-[#FFF5F7] transition-colors"
            >
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const user = { name: 'Apple User', email: 'user@icloud.com', phone: '9876543210' };
                localStorage.setItem('reserva_user_profile', JSON.stringify(user));
                if (onSuccess) onSuccess(user);
                onClose();
              }}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#E5D7DA] text-xs font-semibold text-[#333333] hover:bg-[#FFF5F7] transition-colors"
            >
              <span>Apple</span>
            </button>
          </div>
        </div>

        {/* Toggle Mode */}
        <div className="text-center pt-1 border-t border-[#F0E6E8]">
          <p className="text-xs text-[#666666]">
            {mode === 'login' ? 'New to Reserva? ' : 'Already have an account? '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-[#6B1736] font-bold hover:underline"
            >
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
