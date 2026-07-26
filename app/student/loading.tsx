export default function StudentLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-slate-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3" />
        ))}
      </div>
      <div className="h-64 bg-white border border-slate-200 rounded-xl p-4 shadow-sm" />
    </div>
  );
}
