import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import Sidebar from './Sidebar'
import GraphView from './GraphView'
import LiveFeed from './LiveFeed'
import HealthScore from './HealthScore'
import ExportReport from './ExportReport'
import AlertNotifications from './AlertNotifications'
import IntegrationSettings from './IntegrationSettings'
import APIHealth from './APIHealth'

const WS_PATH = '/api/ws'
const STATUS_PATH = '/api/status'
const MANUAL_CHECK_PATH = '/api/test-check'

const sampleEndpoints = [
  {
    id: 'sample-1',
    name: 'Payments API',
    url: 'https://demo.payments.example.com/v1/status',
    serviceName: 'Payments Service',
    organizationName: 'Acme Corp',
    status: 'UP',
  },
  {
    id: 'sample-2',
    name: 'Orders API',
    url: 'https://demo.orders.example.com/v1/status',
    serviceName: 'Orders Service',
    organizationName: 'Acme Corp',
    status: 'DOWN',
  },
  {
    id: 'sample-3',
    name: 'Inventory API',
    url: 'https://demo.inventory.example.com/v1/status',
    serviceName: 'Inventory Service',
    organizationName: 'Acme Corp',
    status: 'UP',
  },
  {
    id: 'sample-4',
    name: 'Gateway API',
    url: 'https://demo.gateway.example.com/v1/status',
    serviceName: 'Gateway Service',
    organizationName: 'Acme Corp',
    status: 'UP',
  },
]

function formatRelativeAge(timestamp, now) {
  if (!timestamp) return 'Unknown'
  const ts = new Date(timestamp).getTime()
  if (Number.isNaN(ts)) return 'Unknown'
  const diff = Math.max(0, Math.floor((now - ts) / 1000))
  if (diff === 0) return 'just now'
  if (diff === 1) return '1 second ago'
  if (diff < 60) return `${diff} seconds ago`
  const minutes = Math.floor(diff / 60)
  return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
}

export default function Dashboard({ token, username, onLogout }) {
  const [endpoints, setEndpoints] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [checking, setChecking] = useState({})
  const [now, setNow] = useState(Date.now())
  const [logs, setLogs] = useState([])
  const [useDemoGraph, setUseDemoGraph] = useState(false)
  const [liveEndpointsAvailable, setLiveEndpointsAvailable] = useState(false)
  const [alertMode, setAlertMode] = useState('PRODUCTION')
  const [alertChannels, setAlertChannels] = useState([])

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080'
  const wsUrl = apiBase.replace(/^http/, 'ws') + WS_PATH + (token ? `?token=${encodeURIComponent(token)}` : '')

  useEffect(() => {
    async function fetchEndpoints() {
      try {
        const response = await fetch(`${apiBase}${STATUS_PATH}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (response.status === 401 || response.status === 403) {
          onLogout()
          return
        }
        const payload = await response.json()
        const receivedEndpoints = payload.endpoints || []
        if (receivedEndpoints.length === 0) {
          setLiveEndpointsAvailable(false)
        } else {
          setLiveEndpointsAvailable(true)
        }
        setAlertMode(payload.alertMode || 'PRODUCTION')
        setAlertChannels(payload.alertChannels || [])
        setEndpoints(payload.endpoints || [])
      } catch (error) {
        console.error('Unable to load endpoints', error)
        setLiveEndpointsAvailable(false)
      }
    }

    fetchEndpoints()
  }, [apiBase])

  useEffect(() => {
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (!payload.endpointId || !payload.status) return

        const timestamp = new Date().toLocaleTimeString()
        const logEntry = {
          timestamp,
          message: payload.isServiceEvent
            ? payload.message || `SERVICE OUTAGE: ${payload.serviceName}`
            : `[${payload.name}] transitioned to ${payload.status}`,
          type: payload.status === 'DOWN' ? 'error' : 'success',
        }
        setLogs((prev) => [logEntry, ...prev].slice(0, 50))

        if (payload.status === 'DOWN') {
          const msg = payload.isServiceEvent
            ? `🚨 SERVICE OUTAGE: ${payload.serviceName} is completely unreachable!`
            : `CRITICAL: ${payload.serviceName || 'Service'} is down. Impacting ${payload.organizationName || 'Organization'}!`
          toast.error(msg, { duration: 0 })
        }

        setStatusMap((prev) => ({ ...prev, [payload.endpointId]: payload.status }))
        setEndpoints((prev) =>
          prev.map((endpoint) =>
            endpoint.id === payload.endpointId
              ? { ...endpoint, status: payload.status, lastChecked: new Date().toISOString() }
              : endpoint
          )
        )
      } catch (error) {
        console.error('WebSocket parse error', error)
      }
    }

    ws.onopen = () => {
      console.debug('WebSocket connected to', wsUrl)
      const logEntry = {
        timestamp: new Date().toLocaleTimeString(),
        message: 'Connected to monitoring system',
        type: 'success',
      }
      setLogs((prev) => [logEntry, ...prev].slice(0, 50))
    }

    ws.onclose = () => {
      console.debug('WebSocket closed')
    }

    return () => ws.close()
  }, [wsUrl])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const demoMode = useDemoGraph || !liveEndpointsAvailable
  const displayedEndpoints = demoMode ? sampleEndpoints : endpoints.length > 0 ? endpoints : sampleEndpoints

  const handleManualCheck = async (endpointId) => {
    setChecking((prev) => ({ ...prev, [endpointId]: true }))

    try {
      const response = await fetch(`${apiBase}${MANUAL_CHECK_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: endpointId }),
      })
      if (response.status === 401 || response.status === 403) {
        onLogout()
      }
    } catch (error) {
      console.error('Manual check failed', error)
    } finally {
      setChecking((prev) => ({ ...prev, [endpointId]: false }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Z</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Z-Check Pro</h1>
                  <p className="text-xs text-slate-400">Enterprise Monitoring Platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm text-slate-300">Live • {username}</span>
              </div>
              <button
                type="button"
                onClick={() => setUseDemoGraph((prev) => !prev)}
                className="px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-sm font-medium text-slate-200 transition border border-slate-600/50"
              >
                {demoMode ? '📊 View Live' : '🎬 Demo Mode'}
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-sm font-medium text-red-300 transition border border-red-500/30"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="px-4 py-3 rounded-lg bg-slate-800/30 border border-slate-700/50 backdrop-blur-sm">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Alert Mode</p>
              <p className="text-lg font-semibold text-white">{alertMode}</p>
            </div>
            <div className="px-4 py-3 rounded-lg bg-slate-800/30 border border-slate-700/50 backdrop-blur-sm">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Active Channels</p>
              <p className="text-lg font-semibold text-blue-400">{alertChannels.length || 0}</p>
            </div>
            <div className="px-4 py-3 rounded-lg bg-slate-800/30 border border-slate-700/50 backdrop-blur-sm">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Monitored</p>
              <p className="text-lg font-semibold text-emerald-400">{displayedEndpoints.length}</p>
            </div>
            <div className="px-4 py-3 rounded-lg bg-slate-800/30 border border-slate-700/50 backdrop-blur-sm">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Status</p>
              <p className="text-lg font-semibold text-green-400">Operational</p>
            </div>
          </div>

          {/* Channels & Mode Info */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {alertChannels.length > 0 ? (
                <>
                  <span className="text-xs text-slate-400 uppercase tracking-wider mr-2">Channels:</span>
                  {alertChannels.map((channel) => {
                    const colors = {
                      'email': 'from-amber-500/20 to-amber-600/20 text-amber-300 border-amber-500/30',
                      'whatsapp': 'from-green-500/20 to-green-600/20 text-green-300 border-green-500/30',
                      'log': 'from-slate-500/20 to-slate-600/20 text-slate-300 border-slate-500/30',
                    }
                    const colorClass = colors[channel.toLowerCase()] || 'from-blue-500/20 to-blue-600/20 text-blue-300 border-blue-500/30'
                    return (
                      <span key={channel} className={`px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r ${colorClass} border backdrop-blur-sm`}>
                        ✓ {channel}
                      </span>
                    )
                  })}
                </>
              ) : (
                <span className="px-3 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/30">⚠ No alert channels configured</span>
              )}
            </div>
            {demoMode && (
              <div className="px-4 py-2 rounded-lg bg-orange-500/10 text-orange-300 text-xs border border-orange-500/30 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                {liveEndpointsAvailable ? 'Demo mode active' : 'No live data • Demo mode active'}
              </div>
            )}
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid gap-6 mb-8">
          {/* Top Row - Health & Export */}
          <HealthScore endpoints={endpoints} />

          {/* Alerts & Integrations Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            <AlertNotifications alertMode={alertMode} alertChannels={alertChannels} />
            <IntegrationSettings />
          </div>

          {/* API Health Monitor */}
          <APIHealth apiBase={apiBase} token={token} />

          {/* Main Dashboard Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Panel - Endpoints List */}
            <div className="lg:col-span-1">
              <Sidebar
                endpoints={displayedEndpoints}
                selectedNode={selectedNode}
                demoMode={demoMode}
                onCheck={handleManualCheck}
                checking={checking}
                apiBase={apiBase}
              />
            </div>

            {/* Center/Right - Graph */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md overflow-hidden shadow-2xl shadow-slate-950/50">
                <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">Service Dependency Graph</h2>
                    <p className="text-xs text-slate-400 mt-1">Real-time service relationships and health status</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-medium text-green-400">Live</span>
                  </div>
                </div>

                <div className="h-[600px] w-full overflow-hidden bg-gradient-to-b from-slate-900/50 to-slate-950/50">
                  <GraphView
                    endpoints={displayedEndpoints}
                    statusMap={statusMap}
                    selectedNode={selectedNode}
                    onSelectNode={setSelectedNode}
                    onHoverNode={setHoveredId}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Feed */}
        <LiveFeed logs={logs} />
      </div>
    </div>
  )
}

