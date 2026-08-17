export default function HorizonLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
            </div>
            <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
          </div>
        </div>
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      </div>

      {/* Briefing Banner Skeleton */}
      <div className="h-44 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-12 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
          <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        </div>
      </div>

      {/* What-If Sandbox Skeleton */}
      <div className="h-52 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 space-y-4">
        <div className="h-6 w-72 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="h-12 w-full bg-slate-100 dark:bg-slate-800/50 rounded-2xl"></div>
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-44 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        </div>
      </div>

      {/* 3-Stage Diagnosis Cards Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-56 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="h-40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6"></div>
      </div>
    </div>
  );
}
