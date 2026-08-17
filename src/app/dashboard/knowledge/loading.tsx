export default function KnowledgeLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-52 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>

      {/* Article Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800/60 rounded"></div>
              <div className="h-3.5 w-5/6 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
              <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
