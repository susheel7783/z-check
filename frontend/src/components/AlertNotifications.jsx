import { motion } from 'framer-motion'
import { BellIcon, EnvelopeIcon, ChatBubbleLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

export default function AlertNotifications({ alertMode, alertChannels }) {
  const getChannelInfo = (channel) => {
    const info = {
      email: {
        icon: EnvelopeIcon,
        label: 'Email',
        color: 'from-amber-500 to-amber-600',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-300',
        borderColor: 'border-amber-500/30',
      },
      whatsapp: {
        icon: ChatBubbleLeftIcon,
        label: 'WhatsApp',
        color: 'from-green-500 to-green-600',
        bgColor: 'bg-green-500/10',
        textColor: 'text-green-300',
        borderColor: 'border-green-500/30',
      },
      log: {
        icon: DocumentTextIcon,
        label: 'Logs',
        color: 'from-slate-500 to-slate-600',
        bgColor: 'bg-slate-500/10',
        textColor: 'text-slate-300',
        borderColor: 'border-slate-500/30',
      },
    }
    return info[channel.toLowerCase()] || info.log
  }

  const recentAlerts = [
    { id: 1, title: 'Payment Service Down', severity: 'critical', time: '2 min ago', channel: 'email' },
    { id: 2, title: 'High Latency Detected', severity: 'warning', time: '5 min ago', channel: 'whatsapp' },
    { id: 3, title: 'API Threshold Exceeded', severity: 'warning', time: '12 min ago', channel: 'log' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-xl border border-slate-700/50 bg-slate-900 overflow-hidden shadow"
    >
      {/* Header */}
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellIcon className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-lg font-bold text-white">Alert Configuration</h3>
            <p className="text-xs text-slate-400 mt-1">Active notification channels</p>
          </div>
        </div>
        {alertChannels.length > 0 && (
          <div className="px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/30">
            <span className="text-xs font-medium text-green-300">✓ Ready</span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Alert Mode */}
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">Mode</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span className="text-sm font-semibold text-blue-300">{alertMode}</span>
          </div>
        </div>

        {/* Active Channels */}
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">Channels</p>
          {alertChannels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {alertChannels.map((channel) => {
                const info = getChannelInfo(channel)
                const Icon = info.icon
                return (
                  <motion.div
                    key={channel}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${info.bgColor} ${info.borderColor}`}
                  >
                    <Icon className={`w-5 h-5 ${info.textColor}`} />
                    <div>
                      <p className={`text-sm font-semibold ${info.textColor}`}>{info.label}</p>
                      <p className="text-xs text-slate-500">Active</p>
                    </div>
                    <div className="ml-auto w-2 h-2 rounded-full bg-slate-400 animate-pulse"></div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-300">⚠ No alert channels configured</p>
              <p className="text-xs text-red-300/70 mt-1">Configure channels to receive notifications</p>
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">Recent Alerts</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentAlerts.map((alert, idx) => {
              const severity = alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'
              const severityText = alert.severity === 'critical' ? 'text-red-300' : 'text-yellow-300'
              const channelInfo = getChannelInfo(alert.channel)
              const ChannelIcon = channelInfo.icon
              
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${severity}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${severityText}`}>{alert.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{alert.time}</p>
                  </div>
                  <ChannelIcon className={`w-4 h-4 flex-shrink-0 ${channelInfo.textColor}`} />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
