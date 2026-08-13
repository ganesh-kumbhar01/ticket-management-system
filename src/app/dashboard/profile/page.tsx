import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) redirect('/login');
  
  const payload = await verifyJwtToken(token);
  if (!payload) redirect('/login');

  return (
    <div className="p-8 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 min-h-full">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white dark:text-white">{payload.role === 'ADMIN' ? 'Admin Profile' : 'Agent Profile'}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Manage your account details.</p>

        <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center space-x-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-sm">
              {payload.email[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">{payload.email}</h2>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1 font-medium">Role: <span className="text-blue-600 font-bold uppercase tracking-wider text-xs px-2 py-1 bg-blue-50 rounded-md ml-1">{payload.role}</span></p>
            </div>
          </div>
          
          <div className="border-t border-slate-100 dark:border-slate-800/50 dark:border-slate-800/50 pt-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">Account Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Email Address</p>
                <p className="font-bold text-slate-900 dark:text-white dark:text-white">{payload.email}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1 uppercase tracking-wider">Account Status</p>
                <p className="font-bold text-emerald-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Active
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
