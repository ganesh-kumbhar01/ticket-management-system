export default function TicketDetailLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-80 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Chat Conversation Thread (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Messages Card */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
            {/* Customer Original Message */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-3 w-40 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
                  </div>
                </div>
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            </div>

            {/* Agent / AI Response Bubble */}
            <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-200 dark:bg-indigo-900/60"></div>
                  <div className="space-y-1.5">
                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
                  </div>
                </div>
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-4/5 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            </div>
          </div>

          {/* Reply Box Skeleton */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
              <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>
            <div className="h-28 w-full bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
            <div className="flex items-center justify-between pt-2">
              <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
              <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>
          </div>

        </div>

        {/* Right Column: Sidebar Properties (1 col) */}
        <div className="space-y-6">
          
          {/* Customer Card Skeleton */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
              </div>
            </div>
          </div>

          {/* Ticket Metadata Skeleton */}
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
                  <div className="h-9 w-full bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
