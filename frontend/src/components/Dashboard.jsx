import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import Sidebar from './Sidebar'
import GraphView from './GraphView'
import LiveFeed from './LiveFeed'
import HealthScore from './HealthScore'
import ExportReport from './ExportReport'

const WS_PATH = '/api/ws'
const STATUS_PATH = '/api/status'
const MANUAL_CHECK_PATH = '/api/test-check'

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

export default function Dashboard() {
  const [endpoints, setEndpoints] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [checking, setChecking] = useState({})
  const [now, setNow] = useState(Date.now())
  const [logs, setLogs] = useState([])

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080'
  const wsUrl = apiBase.replace(/^http/, 'ws') + WS_PATH

  useEffect(() => {
    async function fetchEndpoints() {
      try {
        const response = await fetch(`${apiBase}${STATUS_PATH}`)
        const payload = await response.json()
        setEndpoints(payload.endpoints || [])
      } catch (error) {
        console.error('Unable to load endpoints', error)
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

  const handleManualCheck = async (endpointId) => {
    setChecking((prev) => ({ ...prev, [endpointId]: true }))

    try {
      await fetch(`${apiBase}${MANUAL_CHECK_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: endpointId }),
      })
    } catch (error) {
      console.error('Manual check failed', error)
    } finally {
      setChecking((prev) => ({ ...prev, [endpointId]: false }))
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto space-y-6">
        <header className="rounded-3xl border border-slate-800/70 bg-slate-900/60 px-6 py-5 backdrop-blur-xl shadow-2xl shadow-slate-950/30">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Mission Control</p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Split-View API & Dependency Dashboard</h1>
          <p className="mt-2 text-slate-400 max-w-3xl">Monitor every endpoint live while tracking service dependency flow in a real-time graph. Hover cards to spotlight graph nodes and trigger checks instantly from the left panel.</p>
        </header>

        <HealthScore endpoints={endpoints} />

        <div className="flex justify-end">
          <ExportReport endpoints={endpoints} logs={logs} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Sidebar
            endpoints={endpoints}
            selectedNode={selectedNode}
            onCheck={handleManualCheck}
            checking={checking}
            apiBase={apiBase}
          />

          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-4 backdrop-blur-xl shadow-xl shadow-slate-950/40">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-700/50 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Dependency Graph</p>
                <h2 className="text-xl font-semibold text-white">Live Service Map</h2>
              </div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">Realtime</span>
            </div>

            <div className="h-[85vh] min-h-[460px] w-full overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950">
              <GraphView
                endpoints={endpoints}
                statusMap={statusMap}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNode}
                onHoverNode={setHoveredId}
              />
            </div>
          </div>
        </div>

        <LiveFeed logs={logs} />
      </div>
    </div>
  )
}

