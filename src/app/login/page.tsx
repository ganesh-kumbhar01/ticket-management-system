"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <main className="min-h-screen w-full relative overflow-hidden bg-[#e0ecfc] flex flex-col lg:flex-row items-center justify-center lg:justify-between p-4 sm:p-6 lg:p-12 xl:px-32 font-sans">
      
      {/* Top Left Branding */}
      <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-40 flex items-center gap-2.5">
        <div className="w-8 h-8 bg-blue-600 rounded-[10px] flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Ticket className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-xl font-bold text-[#0a1a3a] tracking-tight">
          helpdesk
        </span>
      </div>

      {/* 8K Infinite Resolution CSS Background (Darker/More Saturated) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Soft base layer overlay */}
        <div className="absolute inset-0 bg-white/10 z-10 backdrop-blur-[60px]" />
        
        {/* Main sweeping blue wave */}
        <div className="absolute -left-[10%] bottom-[5%] w-[120%] h-[60%] bg-[#3b66f5]/50 rounded-[100%] blur-[120px] -rotate-12" />
        
        {/* Secondary purplish glow (darker) */}
        <div className="absolute left-[5%] top-[15%] w-[50%] h-[50%] bg-[#7768f5]/45 rounded-full blur-[130px]" />
        
        {/* Cyan accent (darker/vibrant) */}
        <div className="absolute -right-[10%] -top-[10%] w-[60%] h-[60%] bg-[#36d6f5]/45 rounded-full blur-[140px]" />
        
        {/* Deep blue bottom-right fill */}
        <div className="absolute right-[5%] -bottom-[20%] w-[70%] h-[60%] bg-[#2554d6]/35 rounded-full blur-[120px]" />
        
        {/* Crisp vector wave line overlay */}
        <svg 
          className="absolute inset-0 w-full h-full z-20 opacity-[0.3]" 
          viewBox="0 0 1440 900" 
          preserveAspectRatio="xMidYMid slice" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M0,450 C300,550 500,250 800,400 C1100,550 1300,350 1440,450 L1440,900 L0,900 Z" 
            fill="url(#gradient-overlay)" 
          />
          <defs>
            <linearGradient id="gradient-overlay" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Left Content (Typography & Floating Chat Bubbles) */}
      <div className="relative z-20 hidden lg:flex flex-col justify-center h-full w-full max-w-xl pl-4 xl:pl-16">
        
        {/* Decorative Floating Chat Bubbles */}
        <div className="absolute top-[28%] left-[40%] flex flex-col gap-3 w-[280px]">
          <div className="bg-white/80 backdrop-blur-xl px-5 py-3 rounded-[20px] rounded-bl-sm text-[13px] text-slate-700 font-semibold shadow-sm border border-white/60 w-fit">
            Hi! How can I help you?
          </div>
          <div className="bg-white/80 backdrop-blur-xl px-5 py-3 rounded-[20px] rounded-bl-sm text-[13px] text-slate-700 font-semibold shadow-sm border border-white/60 ml-8 w-fit">
            I'll need to verify your identity first.
          </div>
        </div>

        {/* Center Huge Typography */}
        <div className="relative mt-12 z-10 select-none">
          <p className="text-slate-400/80 font-black tracking-[0.4em] text-xs xl:text-sm mb-[-1rem] ml-2 uppercase">The</p>
          <h1 className="text-[5.5rem] xl:text-[7.5rem] leading-none font-black text-[#0a1a3a] tracking-tight drop-shadow-sm">
            helpdesk
          </h1>
          <p className="text-slate-400/80 font-black tracking-[0.4em] text-xs xl:text-sm mt-[-1rem] ml-3 uppercase">Future</p>
        </div>
      </div>

      {/* Floating White Login Card (Existing Box) */}
      <div className="relative z-30 w-full max-w-[430px] bg-white/95 backdrop-blur-3xl rounded-[36px] sm:rounded-[44px] p-8 sm:p-11 shadow-[0_30px_80px_rgba(40,65,120,0.15)] border border-white flex flex-col justify-between animate-in fade-in zoom-in-95 duration-300">
        
        <div>
          {/* Headline & Subtitle */}
          <div className="text-center space-y-1.5 mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Log in
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Enter your credentials to access your workspace.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-rose-700 leading-relaxed">
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
                className={`w-full h-12 sm:h-13 px-4 sm:px-5 bg-slate-50/80 border ${
                  errors.email 
                    ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500' 
                    : 'border-slate-200 focus:ring-blue-600/20 focus:border-blue-600'
                } rounded-[18px] text-sm font-medium focus:outline-none focus:ring-4 transition-all text-slate-900 placeholder:text-slate-400 shadow-sm`}
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
                  className={`w-full h-12 sm:h-13 pl-4 sm:pl-5 pr-12 bg-slate-50/80 border ${
                    errors.password 
                      ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500' 
                      : 'border-slate-200 focus:ring-blue-600/20 focus:border-blue-600'
                  } rounded-[18px] text-sm font-medium focus:outline-none focus:ring-4 transition-all text-slate-900 placeholder:text-slate-400 shadow-sm`}
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-500 text-[11px] font-bold mt-1.5 ml-2.5">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-0.5 px-1 text-xs">
              <button 
                type="button"
                onClick={() => setValue('rememberMe', !rememberMe, { shouldValidate: true })}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors select-none font-medium"
              >
                {rememberMe ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Remember me</span>
              </button>
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

        {/* Bottom Note */}
        <div className="pt-7 text-center">
          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
            Authorized Agent & Administrator Access Only
          </p>
        </div>

      </div>
    </main>
  );
}
