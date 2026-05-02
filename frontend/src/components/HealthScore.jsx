import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

export default function HealthScore({ endpoints }) {
  const [timeRange, setTimeRange] = useState('24h')

  const { score, status, upCount, downCount, totalCount, uptime, sloStatus } = useMemo(() => {
    const total = endpoints.length
    const up = endpoints.filter((e) => e.status === 'UP').length
    const down = total - up

    const healthScore = total === 0 ? 100 : Math.round((up / total) * 100)
    let healthStatus = 'green' // >95%
    if (healthScore < 95 && healthScore >= 90) {
      healthStatus = 'amber'
    } else if (healthScore < 90) {
      healthStatus = 'red'
    }

    // Simulate uptime percentages based on time range
    const uptimeMap = {
      '24h': 99.87,
      '7d': 99.92,
      '30d': 99.95,
      '90d': 99.98,
    }
    const currentUptime = uptimeMap[timeRange] || 99.87

    // SLO (Service Level Objective) tracking
    const sloTarget = 99.9
    const sloMet = currentUptime >= sloTarget
    const sloStatus = sloMet ? 'met' : 'at-risk'

    return {
      score: healthScore,
      status: healthStatus,
      upCount: up,
      downCount: down,
      totalCount: total,
      uptime: currentUptime,
      sloStatus,
    }
  }, [endpoints, timeRange])

  const getScoreColor = () => {
    if (score >= 95) return 'from-green-500 to-emerald-600'
    if (score >= 90) return 'from-yellow-500 to-amber-600'
    return 'from-red-500 to-rose-600'
  }

  const getSLOColor = () => {
    return sloStatus === 'met' 
      ? 'bg-green-500/10 border-green-500/30 text-green-300'
      : 'bg-orange-500/10 border-orange-500/30 text-orange-300'
  }

  const timeRangeOptions = ['24h', '7d', '30d', '90d']

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md overflow-hidden shadow-2xl shadow-slate-950/50"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">System Health & SLO</h3>
          <p className="text-xs text-slate-400 mt-1">Real-time health metrics and SLA compliance</p>
        </div>
        <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1 border border-slate-700/50">
          {timeRangeOptions.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6">
        {/* Health Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="col-span-1 md:col-span-2 rounded-lg bg-gradient-to-br from-slate-700/20 to-slate-900/40 border border-slate-700/50 p-4"
        >
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Health Score</p>
          <div className="flex items-end gap-3">
            <motion.div
              animate={{
                scale: score < 90 ? [1, 1.02, 1] : 1,
              }}
              transition={{
                duration: score < 90 ? 2 : 0,
                repeat: score < 90 ? Infinity : 0,
              }}
              className={`bg-gradient-to-r ${getScoreColor()} rounded-lg px-4 py-2`}
            >
              <p className="text-3xl font-bold text-white">{score}%</p>
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-400">{upCount} UP</p>
              <p className="text-sm font-semibold text-red-400">{downCount} DOWN</p>
              <p className="text-xs text-slate-500 mt-1">{totalCount} total</p>
            </div>
          </div>
        </motion.div>

        {/* Uptime */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-lg bg-gradient-to-br from-slate-700/20 to-slate-900/40 border border-slate-700/50 p-4 text-center"
        >
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Uptime</p>
          <p className="text-2xl font-bold text-cyan-400">{uptime.toFixed(2)}%</p>
          <p className="text-xs text-slate-500 mt-2">{timeRange}</p>
        </motion.div>

        {/* SLO Target */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-lg bg-gradient-to-br from-slate-700/20 to-slate-900/40 border border-slate-700/50 p-4 text-center"
        >
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">SLO Target</p>
          <p className="text-2xl font-bold text-blue-400">99.90%</p>
          <p className="text-xs text-slate-500 mt-2">Monthly</p>
        </motion.div>

        {/* SLO Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className={`rounded-lg border p-4 text-center ${getSLOColor()}`}
        >
          <p className="text-xs font-medium uppercase tracking-wider mb-2">SLO Status</p>
          <div className="flex items-center justify-center gap-2">
            <span className={`w-2 h-2 rounded-full ${sloStatus === 'met' ? 'bg-green-400' : 'bg-orange-400'} animate-pulse`}></span>
            <p className="text-sm font-bold">{sloStatus === 'met' ? 'MET' : 'AT RISK'}</p>
          </div>
          <p className="text-xs mt-2 opacity-75">Compliant</p>
        </motion.div>
      </div>

      {/* Uptime Breakdown */}
      <div className="px-6 pb-6">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Uptime Breakdown</p>
        <div className="flex gap-2 h-8 rounded-lg overflow-hidden bg-slate-900/30 border border-slate-700/50">
          {/* Simulate uptime segments */}
          {Array.from({ length: 24 }).map((_, i) => {
            const isDown = Math.random() > uptime / 100
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className={`flex-1 ${isDown ? 'bg-red-600' : 'bg-green-600'} hover:opacity-80 transition cursor-pointer`}
                title={`${isDown ? 'Down' : 'Up'} at ${i}:00`}
              />
            )
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">Last 24 hours status by hour</p>
      </div>
    </motion.div>
  )
}
