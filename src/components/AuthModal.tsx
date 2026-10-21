'use client';

import React, { useState, useEffect } from 'react';
import { GashtyarLogo } from './GashtyarLogo';
import { Mail, KeyRound, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { UserProfile } from './Header';

interface AuthModalProps {
  onAuthenticated: (user: UserProfile) => void;
  tabToken: string;
}

export function AuthModal({ onAuthenticated, tabToken }: AuthModalProps) {
  const [step, setStep] = useState<'EMAIL' | 'CODE'>('EMAIL');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestCode = async (targetEmail = email) => {
    const finalEmail = targetEmail.trim().toLowerCase();
    if (!finalEmail || !finalEmail.includes('@')) {
      setError('Please enter a valid corporate email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: finalEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.cooldownLeft) {
          setCooldown(data.cooldownLeft);
        }
        setError(data.error || 'Failed to request verification code.');
        setLoading(false);
        return;
      }

      setEmail(finalEmail);
      setStep('CODE');
      setCooldown(60);
      setSuccessMsg(data.message);
      if (data.devCode) {
        setDevCode(data.devCode);
        setCode(data.devCode); // Auto-fill for convenience in testing
      }
    } catch {
      setError('Connection error requesting code. Please verify network.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tab-token': tabToken,
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          tabToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed. Please check the code.');
        setLoading(false);
        return;
      }

      onAuthenticated(data.user);
    } catch {
      setError('Connection error during verification.');
      setLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'it.admin@gashtyar.com', role: 'IT Manager', name: 'Gahin Mayi' },
    { email: 'ceo@gashtyar.com', role: 'Executive Manager', name: 'Hersh Ahmed' },
    { email: 'auditor@gashtyar.com', role: 'Auditor (Viewer)', name: 'Maryam Zaki' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-modal">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white border-b-4 border-orange-600">
          <GashtyarLogo subtitle="Internal IT Operations & Management" />
          <h2 className="text-xl font-bold mt-4 tracking-tight">Management Access Verification</h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Per company policy, each new visit requires single-use email code verification before confidential operations are revealed.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 'EMAIL' ? (
            /* STEP 1: Enter Invited Corporate Email */
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                Invited Corporate Email
              </label>
              <div className="relative mb-4">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRequestCode()}
                  placeholder="e.g. it.admin@gashtyar.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <button
                onClick={() => handleRequestCode()}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Secure Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Demo Account Quick-Selection */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Invited Company Accounts:
                </div>
                <div className="space-y-1.5">
                  {demoAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => {
                        setEmail(acc.email);
                        handleRequestCode(acc.email);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-300 transition-colors cursor-pointer text-left group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-700">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-slate-500">{acc.email}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                        {acc.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: Enter 6-digit Code */
            <form onSubmit={handleVerifyCode}>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Enter 6-Digit Code
                  </label>
                  <span className="text-xs text-slate-500">{email}</span>
                </div>

                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-lg tracking-widest font-mono text-center font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {devCode && (
                <div className="mb-4 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                  <span>Development Test Code:</span>
                  <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    {devCode}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Access Gashtyar Operations</span>
                  </>
                )}
              </button>

              {/* Resend Code & Back Controls */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setCode('');
                  }}
                  className="hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Change Email
                </button>

                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => handleRequestCode(email)}
                  className="font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 cursor-pointer"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          {/* Security policy footer */}
          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Encrypted verification &bull; 15-minute inactivity limit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
