import { useMemo } from 'react'
import { motion } from 'framer-motion'

export default function HealthScore({ endpoints }) {
  const { score, status, upCount, downCount, totalCount } = useMemo(() => {
    const total = endpoints.length
    const up = endpoints.filter((e) => e.status === 'UP').length
    const down = total - up

    const healthScore = total === 0 ? 100 : Math.round((up / total) * 100)
    let healthStatus = 'green' // >80%
    if (healthScore < 80 && healthScore >= 50) {
      healthStatus = 'amber'
    } else if (healthScore < 50) {
      healthStatus = 'red'
    }

    return {
      score: healthScore,
      status: healthStatus,
      upCount: up,
      downCount: down,
      totalCount: total,
    }
  }, [endpoints])

  const getBackgroundColor = () => {
    switch (status) {
      case 'amber':
        return 'bg-yellow-50 border-yellow-200'
      case 'red':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-green-50 border-green-200'
    }
  }

  const getTextColor = () => {
    switch (status) {
      case 'amber':
        return 'text-yellow-900'
      case 'red':
        return 'text-red-900'
      default:
        return 'text-green-900'
    }
  }

  const getBadgeColor = () => {
    switch (status) {
      case 'amber':
        return 'bg-yellow-100 text-yellow-800'
      case 'red':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-green-100 text-green-800'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-lg border-2 p-4 ${getBackgroundColor()}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-semibold ${getTextColor()}`}>System Health</h3>
          <p className={`mt-1 text-xs ${getTextColor()} opacity-75`}>
            {upCount} UP / {downCount} DOWN
          </p>
        </div>
        <motion.div
          animate={{
            scale: status === 'red' ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: status === 'red' ? 1.5 : 0,
            repeat: status === 'red' ? Infinity : 0,
          }}
          className={`rounded-full ${getBadgeColor()} px-4 py-2 text-center`}
        >
          <p className="text-2xl font-bold">{score}%</p>
          <p className="text-xs font-medium">{status.toUpperCase()}</p>
        </motion.div>
      </div>
    </motion.div>
  )
}
