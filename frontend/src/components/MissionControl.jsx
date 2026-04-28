import { useEffect, useState } from 'react'
import { PlayIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

const StatusCard = ({ endpoint, statusUpdates, onManualCheck, loading }) => {
  const currentStatus = statusUpdates?.[endpoint.id] || endpoint.status
  const isUp = currentStatus === 'UP'
  const isLoading = loading[endpoint.id]

  return (
    <div className={`relative rounded-2xl border-2 p-6 transition-all duration-300 hover:scale-105 ${
      isUp
        ? 'border-green-500/50 bg-slate-800 shadow-lg shadow-green-500/20 ring-2 ring-green-500/30'
        : 'border-red-500/50 bg-slate-800 shadow-lg shadow-red-500/20 ring-2 ring-red-500/30'
    } ${isLoading ? 'animate-pulse' : ''}`}>

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white font-mono">{endpoint.name}</h3>
          <p className="text-sm text-slate-400 mt-1">{endpoint.serviceName} • {endpoint.organizationName}</p>
        </div>
        <div className="relative group">
          <InformationCircleIcon className="h-5 w-5 text-slate-400 hover:text-slate-300 cursor-help" />
          <div className="absolute right-0 top-6 w-80 p-3 bg-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <div className="text-sm">
              <div className="font-medium text-white mb-2">Endpoint Details</div>
              <div className="space-y-1 text-slate-300">
                <div><span className="font-medium">URL:</span> {endpoint.url}</div>
                <div><span className="font-medium">Method:</span> {endpoint.method}</div>
                <div><span className="font-medium">Type:</span> {endpoint.type}</div>
                <div><span className="font-medium">Last Checked:</span> {new Date(endpoint.lastChecked).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isUp ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className={`text-sm font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {currentStatus}
          </span>
        </div>

        <button
          onClick={() => onManualCheck(endpoint.id)}
          disabled={isLoading}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isLoading
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Checking...</span>
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4" />
              <span>Run Check</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function MissionControl({ statusUpdates }) {
  const [endpoints, setEndpoints] = useState([])
  const [loading, setLoading] = useState({})

  useEffect(() => {
    async function loadEndpoints() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/status`)
        if (response.ok) {
          const data = await response.json()
          setEndpoints(data.endpoints || [])
        }
      } catch (error) {
        console.error('Failed to load endpoints:', error)
      }
    }

    loadEndpoints()
  }, [])

  const handleManualCheck = async (endpointId) => {
    setLoading(prev => ({ ...prev, [endpointId]: true }))

    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/test-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: endpointId })
      })
    } catch (err) {
      console.error("Check failed", err)
    } finally {
      setLoading(prev => ({ ...prev, [endpointId]: false }))
    }
  }

  return (
    <div className="mt-6">
      {endpoints.length === 0 ? (
        <div className="text-center py-12">
          <div className="rounded-2xl border-2 border-dashed border-slate-600 bg-slate-800/50 p-8 max-w-md mx-auto">
            <div className="text-slate-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Services Monitored</h3>
            <p className="text-slate-400 text-sm">Endpoints will appear here once they're added to the system.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {endpoints.map((endpoint) => (
            <StatusCard
              key={endpoint.id}
              endpoint={endpoint}
              statusUpdates={statusUpdates}
              onManualCheck={handleManualCheck}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  )
}
