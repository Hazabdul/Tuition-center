export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-slate-200 rounded-md" />
        <div className="h-9 w-24 bg-slate-200 rounded-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 bg-white border border-slate-200 rounded-xl p-4 shadow-sm" />
        <div className="h-72 bg-white border border-slate-200 rounded-xl p-4 shadow-sm" />
      </div>
    </div>
  );
}
