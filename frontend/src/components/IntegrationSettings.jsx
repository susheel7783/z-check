import { motion } from 'framer-motion'
import { CheckCircleIcon, ExclamationIcon } from '@heroicons/react/24/outline'

export default function IntegrationSettings() {
  const integrations = [
    {
      name: 'Slack',
      status: 'connected',
      icon: '💬',
      description: 'Send alerts to Slack channels',
      color: 'from-slate-500 to-slate-600',
    },
    {
      name: 'PagerDuty',
      status: 'connected',
      icon: '🚨',
      description: 'Trigger incidents on critical alerts',
      color: 'from-green-500 to-green-600',
    },
    {
      name: 'Webhooks',
      status: 'available',
      icon: '🔌',
      description: 'Custom webhook endpoints',
      color: 'from-blue-500 to-blue-600',
    },
    {
      name: 'Datadog',
      status: 'available',
      icon: '📊',
      description: 'Sync metrics with Datadog',
      color: 'from-purple-500 to-purple-600',
    },
  ]

  const apiEndpoint = 'https://api.z-check.example.com/v1'
  const apiKey = 'zck_prod_1234567890abcdef...'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-md overflow-hidden shadow-2xl shadow-slate-950/50"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 px-6 py-4 border-b border-slate-700/50">
        <h3 className="text-lg font-bold text-white">Integrations & API</h3>
        <p className="text-xs text-slate-400 mt-1">Connect to external monitoring and alerting platforms</p>
      </div>

      <div className="p-6 space-y-6">
        {/* API Access */}
        <div className="border-b border-slate-700/50 pb-6">
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">API Access</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Endpoint</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={apiEndpoint}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 text-slate-300 text-xs font-mono"
                />
                <button className="px-3 py-2 rounded-lg bg-blue-600/50 hover:bg-blue-600 text-blue-200 text-xs font-medium transition">
                  Copy
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  readOnly
                  value={apiKey}
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 text-slate-300 text-xs font-mono"
                />
                <button className="px-3 py-2 rounded-lg bg-blue-600/50 hover:bg-blue-600 text-blue-200 text-xs font-medium transition">
                  Reveal
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Integrations Grid */}
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">Available Integrations</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {integrations.map((integration, idx) => (
              <motion.div
                key={integration.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="p-4 rounded-lg border border-slate-700/50 bg-slate-900/20 hover:bg-slate-900/40 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{integration.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{integration.description}</p>
                    </div>
                  </div>
                  {integration.status === 'connected' ? (
                    <div className="px-2 py-1 rounded bg-green-500/10 border border-green-500/30">
                      <CheckCircleIcon className="w-4 h-4 text-green-400" />
                    </div>
                  ) : (
                    <button className="px-3 py-1 rounded-lg bg-blue-600/50 hover:bg-blue-600 text-blue-200 text-xs font-medium transition">
                      Connect
                    </button>
                  )}
                </div>
                {integration.status === 'connected' && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    Connected and active
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Webhook Documentation */}
        <div className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Webhook Example</p>
          <code className="text-xs text-slate-300 font-mono block p-2 bg-slate-950/50 rounded border border-slate-700/50 overflow-x-auto">
            {`POST https://api.z-check.example.com/v1/webhooks
Authorization: Bearer zck_prod_...
Content-Type: application/json

{
  "event": "endpoint_status_changed",
  "endpoint_id": "api-1",
  "status": "DOWN",
  "timestamp": "2024-05-02T14:23:15Z"
}`}
          </code>
        </div>
      </div>
    </motion.div>
  )
}
