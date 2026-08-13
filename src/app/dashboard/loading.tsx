export default function Loading() {
  return (
    <div className="p-4 md:p-6 min-h-full animate-pulse">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="h-8 w-64 bg-slate-200 rounded-lg mb-2"></div>
          <div className="h-4 w-96 bg-slate-100 rounded-lg"></div>
        </div>

        {/* Metrics Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white/60 border border-slate-100 rounded-xl p-4">
              <div className="h-3 w-20 bg-slate-200 rounded mb-3"></div>
              <div className="h-8 w-12 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white/60 border border-slate-100 rounded-2xl h-[400px] p-4">
            <div className="h-6 w-48 bg-slate-200 rounded mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-slate-200 rounded-full shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-full bg-slate-200 rounded"></div>
                    <div className="h-3 w-2/3 bg-slate-100 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white/60 border border-slate-100 rounded-2xl h-[400px] p-4">
            <div className="h-6 w-48 bg-slate-200 rounded mb-6"></div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-full bg-slate-200 rounded"></div>
                  <div className="h-10 w-full bg-slate-100 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
