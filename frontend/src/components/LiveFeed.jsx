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
      className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md overflow-hidden shadow-2xl shadow-slate-950/50"
    >
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Event Stream</h3>
          <p className="text-xs text-slate-400 mt-1">Real-time system events and status changes</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-green-400">Live</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="max-h-64 overflow-y-auto bg-gradient-to-b from-slate-900/50 to-slate-950/50 p-4 font-mono text-sm space-y-2"
      >
        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">⏳ Waiting for events...</div>
        ) : (
          logs.map((log, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={`px-3 py-2 rounded text-xs leading-relaxed flex gap-2 ${
                log.type === 'error'
                  ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                  : log.type === 'success'
                  ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                  : 'bg-slate-700/30 text-slate-300 border border-slate-600/20'
              }`}
            >
              <span className="text-slate-500 flex-shrink-0">[{log.timestamp}]</span>
              <span className="flex-1">{log.message}</span>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}
