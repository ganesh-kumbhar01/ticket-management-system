"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [devLink, setDevLink] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Failed to send reset link');
      }

      setStatus('success');
      setMessage(resData.message || 'Reset link sent successfully!');
      if (resData.devLink) {
        setDevLink(resData.devLink);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 p-4 font-sans">
      {/* HelpDesk Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <span className="text-2xl font-black text-slate-900 dark:text-white dark:text-white tracking-tight">HelpDesk</span>
      </div>

      <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 dark:border-slate-800 overflow-hidden">
        <div className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white mb-2 tracking-tight">
              Reset Password
            </h2>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm">
              Enter your email to get a reset link
            </p>
          </div>

          {status === 'success' ? (
            <div className="text-center space-y-6">
              <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                <svg className="w-10 h-10 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-700 font-medium leading-relaxed mb-4">
                  {message}
                </p>
                {devLink && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-xs text-green-700 mb-2 font-semibold uppercase tracking-wider">[DEV MODE] Simulated Email Link:</p>
                    <Link href={devLink} className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors break-all text-xs">
                      Click to Reset Password
                    </Link>
                  </div>
                )}
              </div>
              <Link href="/login" className="inline-block text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {status === 'error' && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-red-600 text-sm text-center font-medium">{message}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={`w-full h-12 px-4 bg-white dark:bg-slate-900 dark:bg-slate-900 border ${errors.email ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-300 dark:border-slate-700 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-xl focus:outline-none focus:ring-4 text-slate-900 dark:text-white dark:text-white transition-all placeholder:text-slate-400 dark:text-slate-500 dark:text-slate-500`}
                  placeholder="admin@system.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs font-medium mt-1">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all focus:ring-4 focus:ring-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
              </button>

              <div className="text-center">
                <Link href="/login" className="text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 dark:text-slate-200 transition-colors">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
