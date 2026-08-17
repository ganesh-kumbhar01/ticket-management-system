export default function ProfileLoading() {
  return (
    <div className="p-4 sm:p-8 min-h-full animate-pulse">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
          </div>
          <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>

        {/* Profile Card Skeleton */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
            <div className="space-y-2">
              <div className="h-5 w-44 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
                <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Executive Reports Card Skeleton */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="h-6 w-60 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-28 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4"></div>
            <div className="h-28 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
