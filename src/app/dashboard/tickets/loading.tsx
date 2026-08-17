export default function TicketsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>

      {/* Table Container Skeleton */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0"></div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-800 shrink-0"></div>
                <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0"></div>
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                  </div>
                  <div className="h-3 w-1/4 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
