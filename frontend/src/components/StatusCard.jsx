import { PlayIcon, SparklesIcon } from '@heroicons/react/24/outline'

export default function StatusCard({ endpoint, isHovered, onHover, onLeave, onCheck, checking, relativeAge }) {
  const currentStatus = endpoint.status || 'UNKNOWN'
  const isUp = currentStatus === 'UP'
  const truncatedUrl = endpoint.url?.length > 52 ? `${endpoint.url.slice(0, 52)}...` : endpoint.url

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(endpoint.id)}
      onMouseLeave={onLeave}
      data-endpoint-id={endpoint.id}
      className={`group w-full text-left rounded-3xl border border-slate-700/80 bg-slate-900 p-5 transition-all duration-200 ease-out shadow 
        ${isHovered ? 'ring-2 ring-cyan-400/40 scale-[1.01]' : 'hover:-translate-y-0.5 hover:shadow-slate-900/40'}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{endpoint.serviceName || 'Service'}</p>
          <h3 className="mt-3 text-lg font-semibold text-slate-100 font-mono">{endpoint.name || endpoint.id}</h3>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${isUp ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
          <span className={`mr-2 h-2.5 w-2.5 rounded-full ${isUp ? 'bg-emerald-400' : 'bg-rose-400'} ${isUp ? 'animate-pulse' : ''}`}></span>
          {isUp ? 'Live' : 'Down'}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-950/30 p-3 text-slate-300 font-mono text-sm break-words">
          {truncatedUrl || 'No URL available'}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-400">
          <div>
            <p className="text-slate-500">Method</p>
            <p className="mt-1 text-slate-100">{endpoint.method || 'GET'}</p>
          </div>
          <div>
            <p className="text-slate-500">Last Checked</p>
            <p className="mt-1 text-slate-100">{relativeAge}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onCheck(endpoint.id)}
          disabled={checking}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${checking ? 'bg-slate-700 text-slate-300 cursor-not-allowed' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'}`}
        >
          {checking ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
              Checking...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <PlayIcon className="h-4 w-4" />
              Check Now
            </span>
          )}
        </button>

        <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-400">
          <SparklesIcon className="h-3.5 w-3.5 text-slate-300" />
          {endpoint.type || 'API'}
        </span>
      </div>
    </button>
  )
}
