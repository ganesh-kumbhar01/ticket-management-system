"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, CheckSquare, Square, Ticket, AlertCircle } from 'lucide-react';

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
    <main className="min-h-screen w-full bg-[#d6e5f7] dark:bg-slate-950 flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans">
      {/* Outer Tablet Frame Matching Exact Reference UI/UX */}
      <div className="relative w-full max-w-6xl bg-[#1a2333] p-3 sm:p-4 md:p-5 rounded-[36px] sm:rounded-[48px] shadow-[0_30px_90px_-15px_rgba(15,23,42,0.4)] border border-slate-700/60 overflow-hidden">
        
        {/* Full Display Screen Canvas */}
        <div className="relative w-full min-h-[580px] sm:min-h-[640px] lg:min-h-[680px] rounded-[28px] sm:rounded-[40px] overflow-hidden shadow-inner flex items-center justify-center lg:justify-end p-4 sm:p-8 lg:p-12">
          
          {/* Full Screen 3D Workspace Scene Background */}
          <Image 
            src="/login_scene_bg.jpg" 
            alt="Support Specialist Workspace Scene" 
            fill
            priority
            className="object-cover object-left md:object-center select-none pointer-events-none"
            sizes="(max-width: 1280px) 100vw, 1200px"
          />

          {/* Subtle Ambient Vignette & Shadow Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent lg:hidden pointer-events-none" />

          {/* Floating Sign-In Card (Exact Replica of Reference Design with Blue Theme) */}
          <div className="relative z-10 w-full max-w-[410px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[32px] sm:rounded-[36px] p-7 sm:p-9 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3)] border border-white/60 dark:border-slate-800/80 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-300">
            
            <div>
              {/* Brand Logo Header */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/25">
                  <Ticket className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  HelpDesk
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="text-center space-y-1.5 mb-7">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Log in to account
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Enter your credentials to access your support dashboard.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

              {/* Form Inputs */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* Email Address Input */}
                <div>
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
                  {errors.email && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1.5 ml-2">{errors.email.message}</p>
                  )}
                </div>

                {/* Password Input with Show/Hide Toggle */}
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
                <div className="flex items-center justify-between pt-0.5 px-1 text-xs">
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

                {/* Submit Action Button */}
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
                      <span>Log in</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Bottom Compliance & Access Note */}
            <div className="pt-6 text-center">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
                Authorized Agent & Administrator Access Only · Support OS
              </p>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
