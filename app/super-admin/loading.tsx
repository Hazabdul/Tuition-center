export default function SuperAdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded" />
          <div className="h-4 w-72 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-7 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-white border border-slate-200 rounded-xl p-4 shadow-sm" />
        <div className="h-64 bg-white border border-slate-200 rounded-xl p-4 shadow-sm" />
      </div>
    </div>
  );
}
