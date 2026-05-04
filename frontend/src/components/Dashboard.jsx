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

export default function Dashboard({ token, username, theme, onToggleTheme, onLogout }) {
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

  const themeClasses = {
    body: theme === 'dark'
      ? 'bg-slate-900 text-slate-100'
      : 'bg-white text-slate-950',
    panel: theme === 'dark'
      ? 'bg-slate-800 border border-slate-700'
      : 'bg-slate-50 border border-slate-200',
    panelHeader: theme === 'dark'
      ? 'bg-slate-700 border-b border-slate-600'
      : 'bg-slate-100 border-b border-slate-200',
    text: theme === 'dark' ? 'text-slate-100' : 'text-slate-950',
    muted: theme === 'dark' ? 'text-slate-400' : 'text-slate-600',
    button: theme === 'dark'
      ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600'
      : 'bg-slate-200 hover:bg-slate-300 text-slate-950 border border-slate-300',
  }

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
    <div className={`min-h-screen ${themeClasses.body}`}>
      <div className={`border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'} sticky top-0 z-40`}>
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <div>
                <h1 className={`text-xl font-semibold ${themeClasses.text}`}>Z-Check</h1>
                <p className={`text-xs ${themeClasses.muted}`}>Monitoring Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-slate-100 border border-slate-200'}`}>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className={themeClasses.text}>Live</span>
              </div>
              <button
                type="button"
                onClick={() => setUseDemoGraph((prev) => !prev)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${themeClasses.button}`}
              >
                {demoMode ? 'View Live' : 'Demo'}
              </button>
              <button
                type="button"
                onClick={onToggleTheme}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${themeClasses.button}`}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                type="button"
                onClick={onLogout}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${theme === 'dark' ? 'bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-800' : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'}`}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        {/* Status Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className={`px-4 py-3 rounded-lg ${themeClasses.panel}`}>
            <p className={`text-xs ${themeClasses.muted} uppercase tracking-wider mb-1`}>Alert Mode</p>
            <p className={`text-lg font-semibold ${themeClasses.text}`}>{alertMode}</p>
          </div>
          <div className={`px-4 py-3 rounded-lg ${themeClasses.panel}`}>
            <p className={`text-xs ${themeClasses.muted} uppercase tracking-wider mb-1`}>Active Channels</p>
            <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{alertChannels.length || 0}</p>
          </div>
          <div className={`px-4 py-3 rounded-lg ${themeClasses.panel}`}>
            <p className={`text-xs ${themeClasses.muted} uppercase tracking-wider mb-1`}>Monitored</p>
            <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{displayedEndpoints.length}</p>
          </div>
          <div className={`px-4 py-3 rounded-lg ${themeClasses.panel}`}>
            <p className={`text-xs ${themeClasses.muted} uppercase tracking-wider mb-1`}>Status</p>
            <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>Operational</p>
          </div>
        </div>

        {/* Channels & Mode Info */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {alertChannels.length > 0 ? (
              <>
                <span className={`text-xs ${themeClasses.muted} uppercase tracking-wider mr-2`}>Channels:</span>
                {alertChannels.map((channel) => {
                  const colors = {
                    'email': `${theme === 'dark' ? 'bg-amber-900 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-700 border-amber-300'}`,
                    'whatsapp': `${theme === 'dark' ? 'bg-green-900 text-green-300 border-green-700' : 'bg-green-100 text-green-700 border-green-300'}`,
                    'log': `${theme === 'dark' ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-200 text-slate-700 border-slate-300'}`,
                  }
                  const colorClass = colors[channel.toLowerCase()] || `${theme === 'dark' ? 'bg-blue-900 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-700 border-blue-300'}`
                  return (
                    <span key={channel} className={`px-3 py-1 rounded-md text-xs font-medium border ${colorClass}`}>
                      ✓ {channel}
                    </span>
                  )
                })}
              </>
            ) : (
              <span className={`px-3 py-1 rounded-md text-xs font-medium ${theme === 'dark' ? 'bg-red-900 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300'}`}>⚠ No alert channels configured</span>
            )}
          </div>
          {demoMode && (
            <div className={`px-4 py-2 rounded-md text-xs flex items-center gap-2 ${theme === 'dark' ? 'bg-orange-900 text-orange-300 border border-orange-700' : 'bg-orange-100 text-orange-700 border border-orange-300'}`}>
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              {liveEndpointsAvailable ? 'Demo mode active' : 'No live data • Demo mode active'}
            </div>
          )}
        </div>

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
            <div className="lg:col-span-1 flex flex-col">
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
            <div className="lg:col-span-2 flex flex-col">
              <div className={`rounded-lg ${themeClasses.panel} overflow-hidden shadow ${theme === 'dark' ? 'shadow-slate-950/10' : 'shadow-slate-400/10'} flex flex-col h-full`}>
                <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'} flex items-center justify-between flex-shrink-0`}>
                  <div>
                    <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-950'} tracking-tight`}>Service Dependency Graph</h2>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mt-1`}>Real-time service relationships and health status</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-medium text-green-400">Live</span>
                  </div>
                </div>

                <div className={`flex-1 w-full min-h-[500px] overflow-hidden rounded-b-lg ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                  <GraphView
                    endpoints={displayedEndpoints}
                    statusMap={statusMap}
                    selectedNode={selectedNode}
                    onSelectNode={setSelectedNode}
                    onHoverNode={setHoveredId}
                    theme={theme}
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

