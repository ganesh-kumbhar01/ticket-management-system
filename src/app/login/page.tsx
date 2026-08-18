"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, CheckSquare, Square, Ticket, AlertCircle, CheckCircle2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  agreeTerms: z.boolean().refine(val => val === true, { message: 'Must agree to terms' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'phone' | 'email'>('email');
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
      agreeTerms: true,
    },
  });

  const agreeTerms = watch('agreeTerms');

  const onSubmit = async (data: LoginFormValues) => {
    setError('');

    if (activeTab === 'phone') return; // Not implemented

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
    <main className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-white via-[#e8f2f9] to-[#e4e5f7] flex items-center p-4 sm:p-6 lg:p-12 font-sans">
      {/* Background Organic Wave shape via blurred gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] -left-[10%] w-[120%] h-[120%] bg-gradient-to-tr from-[#9bb1ff]/30 via-[#c3beff]/20 to-transparent blur-[140px] rounded-full transform -rotate-[20deg] opacity-80"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[100%] h-[100%] bg-gradient-to-tl from-[#7a9df2]/20 via-[#a7c5ff]/20 to-transparent blur-[120px] rounded-full opacity-60"></div>
      </div>

      {/* Top Left Branding */}
      <div className="absolute top-6 left-6 lg:top-10 lg:left-12 z-20 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-indigo-950 rounded-md flex items-center justify-center shadow-sm">
          <Ticket className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-black text-indigo-950 tracking-tight">
          HelpDesk
        </span>
      </div>

      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between relative z-10 gap-12 lg:gap-8">
        
        {/* Center-Left Area (Storytelling) */}
        <div className="hidden lg:flex flex-col relative w-full max-w-2xl mt-12 pl-4">
          
          {/* Floating Chat Bubbles */}
          <div className="absolute -top-32 left-8 flex flex-col gap-3 pointer-events-none z-10 w-80">
             {/* Customer Bubble */}
             <div className="self-end bg-white/50 backdrop-blur-md px-4 py-2.5 rounded-2xl rounded-tr-sm border border-white/60 text-slate-500 text-[12px] font-semibold shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] w-fit transform -rotate-1 opacity-90">
               Hey, my order hasn't arrived yet
             </div>
             {/* Agent Bubble 1 */}
             <div className="self-start bg-indigo-900/5 backdrop-blur-md px-4 py-2.5 rounded-2xl rounded-tl-sm border border-indigo-900/10 text-indigo-900/60 text-[12px] font-semibold shadow-sm w-fit transform rotate-1 opacity-90">
               Of course, let me check that for you.
             </div>
             {/* Agent Bubble 2 */}
             <div className="self-start bg-indigo-900/5 backdrop-blur-md px-4 py-2.5 rounded-2xl rounded-tl-sm border border-indigo-900/10 text-indigo-900/60 text-[12px] font-semibold shadow-sm w-fit transform -rotate-1 opacity-90 relative">
               I'll need to verify your identity first, though.
               <div className="absolute -right-2 -bottom-2 bg-white/70 p-1 rounded-full shadow-sm backdrop-blur-sm">
                 <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
               </div>
             </div>
          </div>

          {/* Oversized Background Wordmark */}
          <div className="relative z-0">
             <h1 className="text-[110px] xl:text-[140px] font-black leading-none tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-indigo-950/15 to-blue-900/5 select-none -ml-3">
               HELPDESK
             </h1>
             <div className="mt-2 flex flex-col gap-1">
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-900/40">AI Support</span>
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-900/40">Resolved in seconds</span>
             </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full max-w-[400px] bg-white/70 backdrop-blur-2xl rounded-[28px] p-8 sm:p-10 shadow-[0_24px_80px_-12px_rgba(40,50,90,0.1)] border border-white/80 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-300 relative z-20">
          
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-8">
              Log in to your account
            </h2>

            {/* Login Tabs */}
            <div className="flex items-center gap-6 mb-7 border-b border-slate-200/60">
              <button 
                type="button"
                onClick={() => setActiveTab('phone')}
                className={`pb-3 text-[13px] font-bold transition-all relative ${activeTab === 'phone' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Phone login
                {activeTab === 'phone' && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-600 rounded-t-full"></div>
                )}
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('email')}
                className={`pb-3 text-[13px] font-bold transition-all relative ${activeTab === 'email' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Email login
                {activeTab === 'email' && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-600 rounded-t-full"></div>
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-rose-700 leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            {/* Form Inputs */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              
              {activeTab === 'phone' ? (
                <div className="h-11 flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-200/60 text-xs text-slate-400 font-medium">
                  Phone authentication disabled in preview
                </div>
              ) : (
                <>
                  <div>
                    <input
                      id="email"
                      type="email"
                      {...register('email')}
                      className={`w-full h-11 px-4 bg-slate-50/60 border ${
                        errors.email 
                          ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-400' 
                          : 'border-slate-200/80 focus:ring-indigo-600/20 focus:border-indigo-400'
                      } rounded-[14px] text-[13px] font-medium focus:outline-none focus:ring-4 transition-all text-slate-800 placeholder:text-slate-400`}
                      placeholder="Email address"
                    />
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register('password')}
                        className={`w-full h-11 pl-4 pr-10 bg-slate-50/60 border ${
                          errors.password 
                            ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-400' 
                            : 'border-slate-200/80 focus:ring-indigo-600/20 focus:border-indigo-400'
                        } rounded-[14px] text-[13px] font-medium focus:outline-none focus:ring-4 transition-all text-slate-800 placeholder:text-slate-400`}
                        placeholder="Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* TOS Checkbox Row */}
              <div className="flex items-start gap-2.5 pt-1.5 pb-2">
                <button 
                  type="button"
                  onClick={() => setValue('agreeTerms', !agreeTerms, { shouldValidate: true })}
                  className="mt-[3px] shrink-0 text-indigo-600 hover:text-indigo-700 transition-colors focus:outline-none"
                >
                  {agreeTerms ? (
                    <CheckSquare className="w-[15px] h-[15px]" />
                  ) : (
                    <Square className="w-[15px] h-[15px] text-slate-300" />
                  )}
                </button>
                <p className="text-[10px] text-slate-500 font-medium leading-[1.4]">
                  I have read and agree to the <Link href="#" className="text-indigo-600 hover:underline">Terms of Service</Link> and <Link href="#" className="text-indigo-600 hover:underline">Privacy Policy</Link>
                </p>
              </div>

              {/* Submit Action Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || activeTab === 'phone' || !agreeTerms}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white rounded-[14px] font-bold text-[13px] transition-all shadow-[0_6px_12px_-4px_rgba(79,70,229,0.3)] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <span>Log in</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Bottom Sign Up Link */}
          <div className="mt-8 pt-5 text-center flex justify-center">
            <p className="text-[11px] text-slate-400 font-medium">
              Don&apos;t have an account? <Link href="#" className="text-indigo-600 font-bold hover:underline ml-1">Sign up</Link>
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
