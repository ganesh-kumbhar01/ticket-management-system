"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, Lock, Eye, EyeOff, CheckSquare, Square, Ticket, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const rememberMe = watch('rememberMe');

  const onSubmit = async (data: LoginFormValues) => {
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Login failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#dbe8f7] dark:bg-slate-950 flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans">
      {/* Outer Device Tablet Frame matching reference UI/UX */}
      <div className="w-full max-w-5xl bg-[#1a2333] p-3 sm:p-4 md:p-5 rounded-[36px] sm:rounded-[44px] shadow-[0_25px_70px_-15px_rgba(15,23,42,0.35)] border border-slate-700/60 transition-all duration-300">
        
        {/* Main Split Window Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-[28px] sm:rounded-[36px] overflow-hidden bg-[#ebf3fc] dark:bg-slate-900 border border-white/50 dark:border-slate-800 shadow-inner">
          
          {/* Left Panel: 3D Illustration Canvas (Matched to Theme) */}
          <div className="lg:col-span-7 bg-[#d9e8f8] dark:bg-slate-900/90 relative min-h-[260px] sm:min-h-[380px] lg:min-h-[580px] flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-white/40 dark:border-slate-800/80">
            
            {/* Ambient Backlight Glow */}
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* 3D Character Illustration */}
            <div className="relative w-full h-full min-h-[260px] sm:min-h-[380px] lg:min-h-[580px]">
              <Image 
                src="/login_illustration.jpg" 
                alt="HelpDesk Support Specialist Workspace" 
                fill
                priority
                className="object-cover object-center scale-[1.02] hover:scale-105 transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            </div>

            {/* Subtle Pill Watermark / Tag */}
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-10">
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-full border border-white/60 dark:border-slate-700/60 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>AI-Powered Support Desk</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Clean Login Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 sm:p-10 md:p-12 flex flex-col justify-between min-h-[500px]">
            
            {/* Logo Brand Header */}
            <div>
              <div className="flex items-center gap-2.5 mb-8">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/25">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  HelpDesk
                </span>
              </div>

              <div className="space-y-1.5 mb-8">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Sign in
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Enter your credentials to access your support dashboard.
                </p>
              </div>

              {/* Error Message Alert */}
              {error && (
                <div className="mb-6 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* Email Field */}
                <div>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      {...register('email')}
                      className={`w-full h-12 px-4 bg-slate-50/80 dark:bg-slate-800/60 border ${
                        errors.email 
                          ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500' 
                          : 'border-slate-200 dark:border-slate-700/80 focus:ring-blue-600/20 focus:border-blue-600'
                      } rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm`}
                      placeholder="Email address"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1.5 ml-2">{errors.email.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register('password')}
                      className={`w-full h-12 pl-4 pr-11 bg-slate-50/80 dark:bg-slate-800/60 border ${
                        errors.password 
                          ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500' 
                          : 'border-slate-200 dark:border-slate-700/80 focus:ring-blue-600/20 focus:border-blue-600'
                      } rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm`}
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1.5 ml-2">{errors.password.message}</p>
                  )}
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between pt-1 px-1 text-xs">
                  <button 
                    type="button"
                    onClick={() => setValue('rememberMe', !rememberMe, { shouldValidate: true })}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors select-none font-medium"
                  >
                    {rememberMe ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Remember me</span>
                  </button>

                  <Link 
                    href="/forgot-password"
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline transition-all"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Action Button (Clean Solid Theme) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-blue-600/25 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Sign in</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Bottom Compliance & Security Note */}
            <div className="pt-8 text-center">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed max-w-xs mx-auto">
                Authorized Agent & Administrator Access Only · Support OS
              </p>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
