import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) redirect('/login');
  
  const payload = await verifyJwtToken(token);
  if (!payload) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      notificationEmail: true,
      role: true,
      status: true,
      createdAt: true
    }
  });

  const displayEmail = user?.email || payload.email;
  const alertEmail = user?.notificationEmail || displayEmail;
  const name = user?.name || displayEmail.split('@')[0];

  return (
    <div className="p-8 bg-slate-50 dark:bg-slate-800/50 min-h-full">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">{payload.role === 'ADMIN' ? 'Admin Profile' : 'Agent Profile'}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Manage your account details and notification preferences.</p>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center space-x-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-sm">
              {displayEmail[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{name}</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Role: <span className="text-blue-600 font-bold uppercase tracking-wider text-xs px-2 py-1 bg-blue-50 dark:bg-blue-950/60 rounded-md ml-1">{payload.role}</span>
              </p>
            </div>
          </div>
          
          <div className="border-t border-slate-100 dark:border-slate-800/50 pt-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Account Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Login Email Address</p>
                <p className="font-bold text-slate-900 dark:text-white">{displayEmail}</p>
              </div>

              <div className="bg-amber-500/10 dark:bg-amber-500/15 p-4 rounded-xl border border-amber-500/30">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Active Alert / SLA Email</p>
                  <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">Alerts</span>
                </div>
                <p className="font-black text-slate-900 dark:text-white">{alertEmail}</p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-1 font-medium">
                  3-Hour SLA breach alerts & critical ticket updates are delivered here.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Account Status</p>
                <p className="font-bold text-emerald-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Active Staff
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Staff ID</p>
                <p className="font-bold text-slate-900 dark:text-white">#{payload.userId.slice(0, 8)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
