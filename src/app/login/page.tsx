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
    <main className="min-h-screen w-full relative overflow-hidden bg-[#9ec4e8] dark:bg-slate-950 flex items-center justify-center lg:justify-end p-4 sm:p-6 lg:p-12 xl:pr-24 font-sans">
      {/* Full-Screen 3D Workspace Scene (No artificial frames or black bezels) */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/login_scene_bg.jpg" 
          alt="Support Workspace Scene" 
          fill
          priority
          unoptimized
          quality={100}
          className="object-cover object-left md:object-center select-none pointer-events-none"
          sizes="100vw"
        />
        {/* Soft Mobile Darkening Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] lg:hidden pointer-events-none" />
      </div>

      {/* Floating White Login Card (Exact UI Structure & Styling matching Reference Design) */}
      <div className="relative z-10 w-full max-w-[430px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[36px] sm:rounded-[44px] p-8 sm:p-11 shadow-[0_25px_70px_rgba(15,23,42,0.22)] border border-white/80 dark:border-slate-800/90 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-300">
        
        <div>
          {/* Logo Header */}
          <div className="flex items-center justify-center gap-2.5 mb-7">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/25">
              <Ticket className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              HelpDesk
            </span>
          </div>

          {/* Headline & Subtitle */}
          <div className="text-center space-y-1.5 mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Log in to account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Enter your credentials to access your support workspace.
            </p>
          </div>

          {/* Error Message */}
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
            {/* Email Address */}
            <div>
              <input
                id="email"
                type="email"
                {...register('email')}
                className={`w-full h-12 sm:h-13 px-4 sm:px-5 bg-slate-50/90 dark:bg-slate-800/60 border ${
                  errors.email 
                    ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500' 
                    : 'border-slate-200 dark:border-slate-700/80 focus:ring-blue-600/20 focus:border-blue-600'
                } rounded-[18px] text-sm font-medium focus:outline-none focus:ring-4 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm`}
                placeholder="Email address"
              />
              {errors.email && (
                <p className="text-rose-500 text-[11px] font-bold mt-1.5 ml-2.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register('password')}
                  className={`w-full h-12 sm:h-13 pl-4 sm:pl-5 pr-12 bg-slate-50/90 dark:bg-slate-800/60 border ${
                    errors.password 
                      ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500' 
                      : 'border-slate-200 dark:border-slate-700/80 focus:ring-blue-600/20 focus:border-blue-600'
                  } rounded-[18px] text-sm font-medium focus:outline-none focus:ring-4 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm`}
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
                <p className="text-rose-500 text-[11px] font-bold mt-1.5 ml-2.5">{errors.password.message}</p>
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
                className="w-full h-12 sm:h-13 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-[18px] font-bold text-sm sm:text-base transition-all shadow-md shadow-blue-600/25 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
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

        {/* Bottom Compliance & Security Note */}
        <div className="pt-7 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
            Authorized Agent & Administrator Access Only · Support OS
          </p>
        </div>

      </div>
    </main>
  );
}
