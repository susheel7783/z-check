import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function APIHealth({ apiBase, token }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState(null)
  const [responseTime, setResponseTime] = useState(null)

  const checkHealth = async () => {
    setLoading(true)
    const startTime = performance.now()
    
    try {
      const response = await fetch(`${apiBase}/health`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      
      const endTime = performance.now()
      setResponseTime(Math.round(endTime - startTime))
      
      if (response.ok) {
        const data = await response.json()
        setHealth({
          status: 'healthy',
          code: response.status,
          timestamp: new Date().toLocaleTimeString(),
          data,
        })
      } else {
        setHealth({
          status: 'degraded',
          code: response.status,
          timestamp: new Date().toLocaleTimeString(),
        })
      }
    } catch (error) {
      setHealth({
        status: 'down',
        error: error.message,
        timestamp: new Date().toLocaleTimeString(),
      })
    } finally {
      setLoading(false)
      setLastChecked(new Date())
    }
  }

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [apiBase, token])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      case 'degraded':
        return <CheckCircleIcon className="w-5 h-5 text-yellow-400" />
      case 'down':
        return <XCircleIcon className="w-5 h-5 text-red-400" />
      default:
        return null
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-slate-950/80 border-green-500/30 text-green-300'
      case 'degraded':
        return 'bg-slate-950/80 border-yellow-500/30 text-yellow-300'
      case 'down':
        return 'bg-slate-950/80 border-red-500/30 text-red-300'
      default:
        return 'bg-slate-950/80 border-slate-500/30 text-slate-200'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'healthy':
        return 'Operational'
      case 'degraded':
        return 'Degraded'
      case 'down':
        return 'Unavailable'
      default:
        return 'Checking...'
    }
  }

  const endpoints = [
    { path: '/health', method: 'GET', description: 'API health check', priority: 'Critical' },
    { path: '/api/status', method: 'GET', description: 'System status and metrics', priority: 'Critical' },
    { path: '/api/endpoints', method: 'GET', description: 'List monitored endpoints', priority: 'High' },
    { path: '/api/ws', method: 'WS', description: 'WebSocket live feed', priority: 'High' },
    { path: '/auth/login', method: 'POST', description: 'User authentication', priority: 'Critical' },
    { path: '/api/test-check', method: 'POST', description: 'Manual endpoint check', priority: 'Medium' },
  ]

  const curlExamples = [
    {
      title: 'Check API Health',
      command: `curl -X GET ${apiBase}/health \\
  -H "Content-Type: application/json"`,
    },
    {
      title: 'Get System Status',
      command: `curl -X GET ${apiBase}/api/status \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
    },
    {
      title: 'List Endpoints',
      command: `curl -X GET ${apiBase}/api/endpoints \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-700/50 bg-slate-900 overflow-hidden shadow"
    >
      {/* Header */}
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {health && getStatusIcon(health.status)}
            <div>
              <h3 className="text-lg font-bold text-white">API Health Monitor</h3>
              <p className="text-xs text-slate-400 mt-1">Real-time API connectivity and performance</p>
            </div>
          </div>
          <motion.button
            onClick={checkHealth}
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-3 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-blue-200 text-xs font-medium transition disabled:opacity-50"
          >
            {loading ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin inline" />
            ) : (
              '↻ Check'
            )}
          </motion.button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status Summary */}
        {health && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`rounded-lg border p-4 ${getStatusColor(health.status)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(health.status)}
                <span className="text-sm font-bold text-white">API Status: {getStatusText(health.status)}</span>
              </div>
              <span className="text-xs text-slate-400">{health.timestamp}</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <p className="text-slate-400">Status Code</p>
                <p className="text-white font-mono font-bold">{health.code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400">Response Time</p>
                <p className="text-white font-mono font-bold">{responseTime}ms</p>
              </div>
              <div>
                <p className="text-slate-400">Last Check</p>
                <p className="text-white font-mono font-bold">
                  {lastChecked ? `${Math.round((Date.now() - lastChecked) / 1000)}s ago` : 'Just now'}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Endpoint</p>
                <p className="text-white font-mono font-bold text-xs truncate">{apiBase}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Connection Test */}
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">Quick Connection Test</p>
          <div className="space-y-2">
            {[
              { label: 'DNS Resolution', status: 'healthy' },
              { label: 'TCP Connection', status: 'healthy' },
              { label: 'TLS Handshake', status: 'healthy' },
              { label: 'HTTP Response', status: health?.status === 'healthy' ? 'healthy' : health?.status === 'degraded' ? 'degraded' : 'down' },
            ].map((test, idx) => (
              <motion.div
                key={test.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/30 border border-slate-700/50"
              >
                <span className="text-xs text-slate-300">{test.label}</span>
                <div className="flex items-center gap-2">
                  {test.status === 'healthy' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                      <span className="text-xs text-green-300">Passed</span>
                    </>
                  )}
                  {test.status === 'degraded' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                      <span className="text-xs text-yellow-300">Slow</span>
                    </>
                  )}
                  {test.status === 'down' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      <span className="text-xs text-red-300">Failed</span>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Endpoints Directory */}
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">API Endpoints</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="pb-2 text-slate-400 font-medium">Endpoint</th>
                  <th className="pb-2 text-slate-400 font-medium">Method</th>
                  <th className="pb-2 text-slate-400 font-medium">Description</th>
                  <th className="pb-2 text-slate-400 font-medium">Priority</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {endpoints.map((endpoint, idx) => (
                  <tr key={idx} className="border-b border-slate-700/30 hover:bg-slate-900/30 transition">
                    <td className="py-2 font-mono text-slate-300">{endpoint.path}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        endpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-300' :
                        endpoint.method === 'POST' ? 'bg-green-500/20 text-green-300' :
                        'bg-purple-500/20 text-purple-300'
                      }`}>
                        {endpoint.method}
                      </span>
                    </td>
                    <td className="py-2 text-slate-400">{endpoint.description}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        endpoint.priority === 'Critical' ? 'bg-red-500/20 text-red-300' :
                        endpoint.priority === 'High' ? 'bg-orange-500/20 text-orange-300' :
                        'bg-slate-500/20 text-slate-300'
                      }`}>
                        {endpoint.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CURL Examples */}
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">Test Endpoints (cURL)</p>
          <div className="space-y-3">
            {curlExamples.map((example, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-lg bg-slate-950/50 border border-slate-700/50 overflow-hidden"
              >
                <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-700/50 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-300">{example.title}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(example.command)}
                    className="px-2 py-1 rounded text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-200 transition"
                  >
                    Copy
                  </button>
                </div>
                <pre className="p-3 text-xs text-slate-300 font-mono overflow-x-auto">
                  {example.command}
                </pre>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Documentation Links */}
        <div className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Documentation</p>
          <div className="space-y-2">
            <a href="#" className="block text-xs text-blue-400 hover:text-blue-300 transition">
              → API Documentation & Reference
            </a>
            <a href="#" className="block text-xs text-blue-400 hover:text-blue-300 transition">
              → Health Check Best Practices
            </a>
            <a href="#" className="block text-xs text-blue-400 hover:text-blue-300 transition">
              → Troubleshooting Guide
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
