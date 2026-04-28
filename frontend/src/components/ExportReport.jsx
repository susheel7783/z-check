import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function ExportReport({ endpoints, logs }) {
  const [isExporting, setIsExporting] = useState(false)

  const exportJSON = () => {
    setIsExporting(true)
    try {
      const report = {
        exportedAt: new Date().toISOString(),
        summary: {
          totalEndpoints: endpoints.length,
          upEndpoints: endpoints.filter((e) => e.status === 'UP').length,
          downEndpoints: endpoints.filter((e) => e.status === 'DOWN').length,
          healthScore: Math.round(
            ((endpoints.filter((e) => e.status === 'UP').length / endpoints.length) * 100) || 0
          ),
        },
        endpoints: endpoints.map((ep) => ({
          id: ep.id,
          name: ep.name,
          url: ep.url,
          type: ep.type,
          status: ep.status,
          lastChecked: ep.lastChecked,
          serviceName: ep.serviceName,
          organizationName: ep.organizationName,
        })),
        recentLogs: logs.slice(0, 50).map((log) => ({
          timestamp: log.timestamp,
          message: log.message,
          type: log.type,
        })),
      }

      const element = document.createElement('a')
      element.setAttribute(
        'href',
        'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2))
      )
      element.setAttribute('download', `z-check-report-${Date.now()}.json`)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)

      toast.success('Report exported as JSON')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export report')
    } finally {
      setIsExporting(false)
    }
  }

  const exportCSV = () => {
    setIsExporting(true)
    try {
      // CSV header for endpoints
      let csv = 'ID,Name,URL,Type,Status,Last Checked,Service,Organization\n'

      endpoints.forEach((ep) => {
        csv += `"${ep.id}","${ep.name}","${ep.url}","${ep.type}","${ep.status}","${ep.lastChecked}","${
          ep.serviceName || ''
        }","${ep.organizationName || ''}"\n`
      })

      // Add logs section
      csv += '\n\n# Recent Activity\n'
      csv += 'Timestamp,Type,Message\n'

      logs.slice(0, 50).forEach((log) => {
        csv += `"${log.timestamp}","${log.type}","${log.message}"\n`
      })

      const element = document.createElement('a')
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv))
      element.setAttribute('download', `z-check-report-${Date.now()}.csv`)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)

      toast.success('Report exported as CSV')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export report')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex gap-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={exportJSON}
        disabled={isExporting}
        className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-blue-600 disabled:opacity-50"
      >
        {isExporting ? 'Exporting...' : 'Download JSON'}
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={exportCSV}
        disabled={isExporting}
        className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-green-600 disabled:opacity-50"
      >
        {isExporting ? 'Exporting...' : 'Download CSV'}
      </motion.button>
    </div>
  )
}
