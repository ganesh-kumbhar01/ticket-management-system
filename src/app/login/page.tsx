"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, Lock, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';

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
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
      {/* Left Column: Visual Showcase (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-1/2 lg:w-7/12 relative flex-col justify-between p-12 lg:p-24 overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 z-0 bg-blue-600 overflow-hidden">
          <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-500/50 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-indigo-500/40 blur-[100px] animate-pulse" style={{ animationDuration: '12s' }} />
          <div className="absolute -bottom-[20%] left-[20%] w-[80%] h-[80%] rounded-full bg-cyan-400/30 blur-[150px] animate-pulse" style={{ animationDuration: '10s' }} />
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <span className="text-3xl font-black text-white tracking-tight">HelpDesk</span>
        </div>

        <div className="relative z-10 mt-auto max-w-xl">
          <h1 className="text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6 tracking-tight">
            Resolve tickets faster with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">intelligent workflows.</span>
          </h1>
          <p className="text-lg text-blue-100/90 leading-relaxed max-w-lg">
            Streamline your customer support experience. Powerful insights, multi-channel syncing, and beautiful UI designed for modern teams.
          </p>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="w-full md:w-1/2 lg:w-5/12 flex items-center justify-center p-6 sm:p-12 md:p-16 relative z-10 bg-white dark:bg-slate-900">
        {/* Mobile Logo (Visible only on small screens) */}
        <div className="absolute top-8 left-8 md:hidden flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">HelpDesk</span>
        </div>

        <div className="w-full max-w-[400px] mt-12 md:mt-0">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 dark:text-slate-400">
              Please enter your details to sign in.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl p-4 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-red-700 dark:text-red-400 text-sm font-medium leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={`w-full h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-950 border ${errors.email ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-blue-600/20 focus:border-blue-600'} rounded-xl focus:outline-none focus:ring-4 text-slate-900 dark:text-white transition-all placeholder:text-slate-400`}
                  placeholder="admin@system.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs font-medium mt-1 ml-1 animate-fade-in">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register('password')}
                  className={`w-full h-12 pl-11 pr-12 bg-slate-50 dark:bg-slate-950 border ${errors.password ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-blue-600/20 focus:border-blue-600'} rounded-xl focus:outline-none focus:ring-4 text-slate-900 dark:text-white transition-all placeholder:text-slate-400`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs font-medium mt-1 ml-1 animate-fade-in">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password row */}
            <div className="flex items-center justify-between pt-1">
              <button 
                type="button"
                onClick={() => setValue('rememberMe', !rememberMe, { shouldValidate: true })}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors focus:outline-none"
              >
                {rememberMe ? 
                  <CheckSquare className="w-4 h-4 text-blue-600" /> : 
                  <Square className="w-4 h-4" />
                }
                <span className="font-medium select-none">Remember me</span>
              </button>
              
              <button type="button" className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400 transition-colors focus:outline-none">
                Forgot password?
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all focus:ring-4 focus:ring-blue-600/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          {/* Subtle footer info */}
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-500">
            Powered by HelpDesk OS · Secure Login
          </p>
        </div>
      </div>
    </div>
  );
}
