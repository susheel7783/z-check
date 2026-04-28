export default function AlertPanel({ items }) {
  return (
    <div className="mt-6 space-y-3 overflow-y-auto h-[60vh] min-h-[400px] max-h-[640px]">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-slate-400">
          No alerts yet. Waiting for health events...
        </div>
      ) : (
        items.map((item, index) => (
          <div key={index} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-600">
            <p className="text-sm font-medium text-slate-200">{item.title || item.service}</p>
            <p className="mt-1 text-xs text-slate-400">{item.message || item.detail}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">{new Date(item.timestamp || Date.now()).toLocaleString()}</p>
          </div>
        ))
      )}
    </div>
  )
}
