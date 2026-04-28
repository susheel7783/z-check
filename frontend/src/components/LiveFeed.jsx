import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export default function LiveFeed({ logs }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl border border-slate-800/70 bg-slate-950/60 p-4 backdrop-blur-xl shadow-xl shadow-slate-950/40"
    >
      <div className="mb-3 flex items-center justify-between border-b border-slate-700/50 pb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-500">System Output</p>
          <h3 className="text-lg font-semibold text-white">Live Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">Streaming</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="max-h-[200px] overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-950 p-4 font-mono text-sm text-slate-300 space-y-1"
      >
        {logs.length === 0 ? (
          <div className="text-slate-500">Waiting for events...</div>
        ) : (
          logs.map((log, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={`text-xs ${
                log.type === 'error'
                  ? 'text-rose-400'
                  : log.type === 'success'
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              <span className="text-slate-600">[{log.timestamp}]</span> {log.message}
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}
