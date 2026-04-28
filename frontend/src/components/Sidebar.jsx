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

export default function Sidebar({ endpoints, selectedNode, onCheck, checking, apiBase }) {
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
    <div className="space-y-4 overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-900/60 p-4 backdrop-blur-xl shadow-xl shadow-slate-950/40">
      <div className="flex flex-col gap-3 border-b border-slate-700/50 pb-4">
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-slate-500">Impact Analysis</p>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className="w-full rounded-2xl border border-slate-700/70 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
            placeholder="Search by name or status"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3 overflow-hidden rounded-3xl bg-slate-950/40 p-3">
        {filteredEndpoints.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700/60 p-6 text-center text-slate-400">
            No matching APIs found. Try a different search or click a node on the graph.
          </div>
        ) : (
          filteredEndpoints.map((endpoint) => {
            const isUp = endpoint.status === 'UP'
            const isRecentlyChecked = recentlyChecked[endpoint.id]
            return (
              <motion.div
                key={endpoint.id}
                animate={
                  isRecentlyChecked
                    ? {
                        borderColor: isUp ? '#34d399' : '#fb7185',
                        boxShadow: isUp
                          ? '0 0 20px rgba(52, 211, 153, 0.3)'
                          : '0 0 20px rgba(251, 113, 133, 0.3)',
                      }
                    : { borderColor: 'rgba(148, 163, 184, 0.5)', boxShadow: 'none' }
                }
                transition={{ duration: 0.6 }}
                className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{endpoint.serviceName || 'Service'}</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-100">{endpoint.name || endpoint.id}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${isUp ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                    {isUp ? 'UP' : 'DOWN'}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-400">{endpoint.url}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <motion.button
                    type="button"
                    onClick={() => handleCheck(endpoint.id)}
                    disabled={checking[endpoint.id]}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition ${checking[endpoint.id] ? 'bg-slate-700 text-slate-300 cursor-not-allowed' : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'}`}
                  >
                    {checking[endpoint.id] ? (
                      <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Scanning...</>
                    ) : (
                      'Check Now'
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => openLogs(endpoint)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-400 hover:bg-slate-900"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    View History
                  </motion.button>
                </div>
              </motion.div>
            )
          })
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
