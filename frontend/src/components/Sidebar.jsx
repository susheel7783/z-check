import { Fragment, useMemo, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { motion } from 'framer-motion'
import { MagnifyingGlassIcon, ArrowPathIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline'

function filterEndpoints(endpoints, query, selectedNode) {
  const queryLower = query.trim().toLowerCase()

  return endpoints.filter((endpoint) => {
    const matchesSearch =
      queryLower.length === 0 ||
      endpoint.name?.toLowerCase().includes(queryLower) ||
      endpoint.status?.toLowerCase().includes(queryLower)

    const matchesSelection = !selectedNode || selectedNode.type === 'endpoint'
      ? (!selectedNode || endpoint.id === selectedNode.id.replace(/^endpoint:/, ''))
      : selectedNode.type === 'service'
      ? endpoint.serviceName === selectedNode.name
      : selectedNode.type === 'organization'
      ? endpoint.organizationName === selectedNode.name
      : true

    return matchesSearch && matchesSelection
  })
}

export default function Sidebar({ endpoints, selectedNode, onCheck, checking, apiBase, demoMode }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeEndpoint, setActiveEndpoint] = useState(null)
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [logsError, setLogsError] = useState(null)
  const [recentlyChecked, setRecentlyChecked] = useState({})

  const filteredEndpoints = useMemo(
    () => filterEndpoints(endpoints, query, selectedNode),
    [endpoints, query, selectedNode]
  )

  const title = selectedNode
    ? selectedNode.type === 'organization'
      ? `Organization: ${selectedNode.name}`
      : selectedNode.type === 'service'
      ? `Service: ${selectedNode.name}`
      : `Endpoint: ${selectedNode.name}`
    : 'All monitored endpoints'

  const openLogs = async (endpoint) => {
    setActiveEndpoint(endpoint)
    setLogs([])
    setLogsError(null)
    setLoadingLogs(true)
    setOpen(true)

    try {
      const response = await fetch(`${apiBase}/api/endpoints/${encodeURIComponent(endpoint.id)}/history`)
      if (!response.ok) {
        throw new Error('Unable to load history')
      }
      const payload = await response.json()
      setLogs(payload.history || [])
    } catch (error) {
      setLogsError(error.message || 'Unable to fetch history')
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleCheck = (endpointId) => {
    setRecentlyChecked((prev) => ({ ...prev, [endpointId]: true }))
    onCheck(endpointId)
    setTimeout(() => {
      setRecentlyChecked((prev) => ({ ...prev, [endpointId]: false }))
    }, 2000)
  }

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md overflow-hidden shadow-2xl shadow-slate-950/50 flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 px-6 py-4 border-b border-slate-700/50">
        <h2 className="text-lg font-bold text-white">Monitored Endpoints</h2>
        <p className="text-xs text-slate-400 mt-1">{filteredEndpoints.length} total</p>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className="w-full rounded-lg border border-slate-700/50 bg-slate-900/50 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            placeholder="Search endpoints..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {/* Demo Mode Notice */}
      {demoMode && (
        <div className="mx-4 mt-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-300">
          📊 Demo mode • Live checks disabled
        </div>
      )}

      {/* Endpoints List */}
      <div className="flex-1 overflow-y-auto">{filteredEndpoints.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <p className="text-sm">No endpoints found</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">{filteredEndpoints.map((endpoint) => {
            const isUp = endpoint.status === 'UP'
            const isRecentlyChecked = recentlyChecked[endpoint.id]
            return (
              <motion.div
                key={endpoint.id}
                animate={
                  isRecentlyChecked
                    ? {
                        borderColor: isUp ? '#22c55e' : '#ef4444',
                        boxShadow: isUp
                          ? '0 0 12px rgba(34, 197, 94, 0.4)'
                          : '0 0 12px rgba(239, 68, 68, 0.4)',
                      }
                    : { borderColor: 'rgba(71, 85, 105, 0.5)', boxShadow: 'none' }
                }
                transition={{ duration: 0.6 }}
                className="rounded-lg border bg-slate-900/50 p-3 hover:bg-slate-900/80 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">{endpoint.serviceName || 'Service'}</p>
                    <h3 className="text-sm font-semibold text-white truncate">{endpoint.name || endpoint.id}</h3>
                  </div>
                  <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isUp ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-green-400' : 'bg-red-400'} ${isUp ? 'animate-pulse' : ''}`}></span>
                    {isUp ? 'UP' : 'DOWN'}
                  </div>
                </div>

                <p className="text-xs text-slate-500 truncate mb-3">{endpoint.url}</p>

                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    type="button"
                    onClick={() => handleCheck(endpoint.id)}
                    disabled={checking[endpoint.id] || demoMode}
                    whileHover={{ scale: demoMode ? 1 : 1.05 }}
                    whileTap={{ scale: demoMode ? 1 : 0.95 }}
                    className={`text-xs font-medium py-1.5 rounded transition inline-flex items-center justify-center gap-1 ${checking[endpoint.id] || demoMode ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed' : 'bg-blue-600/80 hover:bg-blue-600 text-white'}`}
                  >
                    {checking[endpoint.id] ? (
                      <><ArrowPathIcon className="h-3 w-3 animate-spin" /></>
                    ) : (
                      <>↻ Check</>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => openLogs(endpoint)}
                    disabled={demoMode}
                    whileHover={{ scale: demoMode ? 1 : 1.05 }}
                    whileTap={{ scale: demoMode ? 1 : 0.95 }}
                    className={`text-xs font-medium py-1.5 rounded transition inline-flex items-center justify-center gap-1 ${demoMode ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed' : 'bg-slate-700/50 hover:bg-slate-700 text-slate-200'}`}
                  >
                    📋 History
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
          </div>
        )}
      </div>

      <Transition show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-200"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                    <div className="flex h-full flex-col overflow-y-scroll bg-slate-950 py-6 shadow-2xl ring-1 ring-white/10">
                      <div className="px-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Dialog.Title className="text-lg font-semibold text-white">{activeEndpoint?.name || 'Endpoint History'}</Dialog.Title>
                            <p className="mt-1 text-sm text-slate-400">Last 10 status transitions for this endpoint.</p>
                          </div>
                          <button
                            type="button"
                            className="rounded-full border border-slate-700/80 bg-slate-900 p-2 text-slate-300 hover:text-white"
                            onClick={() => setOpen(false)}
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 flex-1 px-6 pb-6">
                        {loadingLogs ? (
                          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 text-center text-slate-400">Loading history...</div>
                        ) : logsError ? (
                          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">{logsError}</div>
                        ) : logs.length === 0 ? (
                          <div className="rounded-3xl border border-slate-700/70 bg-slate-900/80 p-6 text-slate-400">No recent status transitions recorded.</div>
                        ) : (
                          <div className="space-y-4">
                            {logs.map((entry, index) => (
                              <motion.div
                                key={`${activeEndpoint?.id}-${index}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-4"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${entry.status === 'DOWN' ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                                    {entry.status}
                                  </span>
                                  <span className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-slate-300 font-mono">{entry.message || 'Status transition recorded.'}</p>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
