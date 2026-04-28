import { useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

function buildGraph(endpoints) {
  const orgNodes = {}
  const serviceNodes = {}
  const endpointNodes = []
  const links = []
  const criticalServices = new Set()
  const criticalOrgs = new Set()

  endpoints.forEach((endpoint) => {
    const orgName = endpoint.organizationName || 'Unknown Organization'
    const serviceName = endpoint.serviceName || 'Unknown Service'
    const orgKey = `org:${orgName}`
    const serviceKey = `service:${serviceName}`
    const endpointKey = `endpoint:${endpoint.id}`
    const endpointStatus = endpoint.status || 'UNKNOWN'

    if (!orgNodes[orgKey]) {
      orgNodes[orgKey] = {
        id: orgKey,
        name: orgName,
        group: 'organization',
      }
    }

    if (!serviceNodes[serviceKey]) {
      serviceNodes[serviceKey] = {
        id: serviceKey,
        name: serviceName,
        group: 'service',
      }
    }

    endpointNodes.push({
      id: endpointKey,
      name: endpoint.name || endpoint.url || endpoint.id,
      group: 'endpoint',
      status: endpointStatus,
      meta: endpoint,
    })

    links.push({
      source: serviceKey,
      target: endpointKey,
      isCritical: endpointStatus === 'DOWN',
    })

    links.push({
      source: orgKey,
      target: serviceKey,
      isCritical: endpointStatus === 'DOWN',
    })

    if (endpointStatus === 'DOWN') {
      criticalServices.add(serviceKey)
      criticalOrgs.add(orgKey)
    }
  })

  const nodes = [
    ...Object.values(orgNodes),
    ...Object.values(serviceNodes),
    ...endpointNodes,
  ]

  return {
    nodes,
    links: links.map((link) => ({
      ...link,
      isCritical: link.isCritical || criticalServices.has(link.target) || criticalOrgs.has(link.target),
    })),
  }
}

export default function GraphView({ endpoints, statusMap, selectedNode, onSelectNode, onHoverNode }) {
  const graphData = useMemo(() => buildGraph(endpoints), [endpoints])

  const getNodeStatus = (node) => {
    if (node.group !== 'endpoint') return 'UNKNOWN'
    return statusMap[node.id.replace(/^endpoint:/, '')] || node.status || 'UNKNOWN'
  }

  const nodeColor = (node) => {
    if (selectedNode?.id === node.id) return '#38bdf8'
    if (node.group === 'organization') return '#60a5fa'
    if (node.group === 'service') return '#818cf8'
    if (getNodeStatus(node) === 'DOWN') return '#fb7185'
    return '#22c55e'
  }

  const nodeSize = (node) => {
    if (selectedNode?.id === node.id) return 12
    if (node.group === 'organization') return 9
    if (node.group === 'service') return 8
    return 6
  }

  return (
    <ForceGraph2D
      graphData={graphData}
      nodeLabel={(node) => node.name}
      nodeAutoColorBy="group"
      nodeCanvasObject={(node, ctx, globalScale) => {
        const label = node.name
        const fontSize = 12 / globalScale
        const size = nodeSize(node)
        const color = nodeColor(node)

        ctx.beginPath()
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false)
        ctx.fillStyle = color
        ctx.shadowBlur = selectedNode?.id === node.id ? 16 : 0
        ctx.shadowColor = selectedNode?.id === node.id ? '#38bdf8' : color
        ctx.fill()
        ctx.shadowBlur = 0

        if (selectedNode?.id === node.id) {
          ctx.strokeStyle = '#22d3ee'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI, false)
          ctx.stroke()
        }

        ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New'`
        ctx.fillStyle = '#e2e8f0'
        ctx.fillText(label, node.x + size + 6, node.y + fontSize / 2)
      }}
      linkColor={(link) => (link.isCritical ? '#fb7185' : 'rgba(148, 163, 184, 0.18)')}
      linkWidth={(link) => (link.isCritical ? 2.5 : 1)}
      linkDirectionalParticles={2}
      linkDirectionalParticleWidth={(link) => (link.isCritical ? 2 : 0)}
      linkDirectionalParticleColor={(link) => (link.isCritical ? '#fb7185' : '#94a3b8')}
      linkDirectionalParticleSpeed={(link) => (link.isCritical ? 0.6 : 0.2)}
      linkCurveStrength={0.1}
      backgroundColor="rgba(15, 23, 42, 1)"
      onNodeHover={(node) => {
        if (!node) {
          onHoverNode(null)
          return
        }
        if (node.group === 'endpoint') {
          onHoverNode(node.id.replace(/^endpoint:/, ''))
          return
        }
        onHoverNode(null)
      }}
      onNodeClick={(node) => {
        if (!node) return
        if (node.group === 'endpoint') {
          onSelectNode({ type: 'endpoint', id: node.id, name: node.name, node })
          return
        }
        onSelectNode({ type: node.group, id: node.id, name: node.name, node })
      }}
      nodeRelSize={4}
      enableNavigationControls
      d3VelocityDecay={0.3}
      warmupTicks={20}
    />
  )
}
