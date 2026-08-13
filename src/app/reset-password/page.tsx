"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

import { Suspense } from 'react';

function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing reset token.');
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) return;

    setMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword: data.password }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Something went wrong');
      }

      setStatus('success');
      setMessage('Password successfully reset! You can now log in.');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
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
              New Password
            </h2>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm">
              Create a strong new password
            </p>
          </div>

          {status === 'success' ? (
            <div className="text-center space-y-6">
              <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                <p className="text-green-700 font-medium leading-relaxed">
                  {message}
                </p>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {status === 'error' && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-red-600 text-sm text-center font-medium">{message}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300" htmlFor="password">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register('password')}
                    className={`w-full h-12 px-4 bg-white dark:bg-slate-900 dark:bg-slate-900 border ${errors.password ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-300 dark:border-slate-700 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-xl focus:outline-none focus:ring-4 text-slate-900 dark:text-white dark:text-white transition-all placeholder:text-slate-400 dark:text-slate-500 dark:text-slate-500 pr-12`}
                    placeholder="••••••••"
                    disabled={!token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 dark:text-slate-300 transition-colors p-1"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs font-medium mt-1">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  {...register('confirmPassword')}
                  className={`w-full h-12 px-4 bg-white dark:bg-slate-900 dark:bg-slate-900 border ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500' : 'border-slate-300 dark:border-slate-700 dark:border-slate-700 focus:ring-blue-600/10 focus:border-blue-600'} rounded-xl focus:outline-none focus:ring-4 text-slate-900 dark:text-white dark:text-white transition-all placeholder:text-slate-400 dark:text-slate-500 dark:text-slate-500`}
                  placeholder="••••••••"
                  disabled={!token}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs font-medium mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all focus:ring-4 focus:ring-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
