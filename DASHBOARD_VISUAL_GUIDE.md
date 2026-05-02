# What You'll See on Your Dashboard

## Full Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  [MISSION CONTROL] Split-View API & Dependency Dashboard                      │
│  Monitor every endpoint live while tracking service dependency flow            │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │ System Health                                                       │       │
│  │ 0 UP / 4 DOWN                        100%  RED  [Download JSON/CSV]│       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
├─────────────────────┬───────────────────────────────────────────────────────────┤
│                     │                                                           │
│ IMPACT ANALYSIS     │  DEPENDENCY GRAPH                                         │
│                     │  Live Service Map                          [REALTIME]     │
│                     │                                                           │
│ All monitored       │  ┌─────────────────────────────────────────────────────┐ │
│ endpoints           │  │                                                     │ │
│                     │  │  ┏━━━━━━━━━━━━━━┓         ┏━━━━━━━━━━━━━━━┓       │ │
│ 🔍 Search...        │  │  ┃ Acme Corp   ┃         ┃ Nimbus Fin   ┃       │ │
│                     │  │  ┗━━━━━━━━━━━━━━┛         ┗━━━━━━━━━━━━━━━┛       │ │
│                     │  │         │ ↘                 ↙ │                     │ │
│ ┌─────────────────┐ │  │  ┌──────┴─────┐       ┌──────┴──────┐             │ │
│ │ Stripe Status   │ │  │  │ Stripe     │       │ Gmail      │             │ │
│ │ API             │ │  │  │ Payments   │       │ Business   │             │ │
│ │ Service:        │ │  │  └──────┬─────┘       └──────┬──────┘             │ │
│ │ Stripe          │ │  │         │                    │                     │ │
│ │ Organization:   │ │  │   ┌─────┴──────┐      ┌──────┴──────┐            │ │
│ │ Acme Corporation│ │  │   │🔴 Stripe   │      │🔴 Gmail    │            │ │
│ │ Status: DOWN    │ │  │   │ Status API │      │ Health Chk │            │ │
│ │ Last: 5m ago    │ │  │   └────────────┘      └────────────┘            │ │
│ │ [Check Now] ▶   │ │  │        ⚬ ⚬ ⚬                ⚬ ⚬               │ │
│ │                 │ │  │    (animated particles)                          │ │
│ ├─────────────────┤ │  │                                                     │ │
│ │ Gmail Health    │ │  │  ┌──────────────┐        ┌─────────────────┐   │ │
│ │ Check           │ │  │  │ Zapier       │        │ Salesforce      │   │ │
│ │ Service:        │ │  │  │ Automations  │        │ CRM             │   │ │
│ │ Gmail Business  │ │  │  └───────┬──────┘        └────────┬────────┘   │ │
│ │ Organization:   │ │  │          │                       │              │ │
│ │ Nimbus Financial│ │  │  ┌───────┴─────┐       ┌─────────┴──────┐     │ │
│ │ Status: DOWN    │ │  │  │🔴 Zapier    │       │🔴 Salesforce  │     │ │
│ │ Last: 4m ago    │ │  │  │ Webhook     │       │ REST API       │     │ │
│ │ [Check Now] ▶   │ │  │  └─────────────┘       └────────────────┘     │ │
│ │                 │ │  │                                                     │ │
│ ├─────────────────┤ │  │  [Drag to pan | Scroll to zoom]                 │ │
│ │ Zapier Webhook  │ │  │                                                     │ │
│ │ Runner          │ │  └─────────────────────────────────────────────────────┘ │
│ │ Service:        │ │                                                           │
│ │ Zapier          │ │  Legend:                                                  │
│ │ Organization:   │ │  🔵 = Organization    🟣 = Service    🔴 = Down         │
│ │ Acme Corporation│ │  🟢 = Up             ⚬ = Animated particles on critical  │
│ │ Status: DOWN    │ │                                                           │
│ │ Last: 6m ago    │ │                                                           │
│ │ [Check Now] ▶   │ │                                                           │
│ │                 │ │                                                           │
│ ├─────────────────┤ │                                                           │
│ │ Salesforce REST │ │                                                           │
│ │ API             │ │                                                           │
│ │ Service:        │ │                                                           │
│ │ Salesforce CRM  │ │                                                           │
│ │ Organization:   │ │                                                           │
│ │ Nimbus Financial│ │                                                           │
│ │ Status: DOWN    │ │                                                           │
│ │ Last: 3m ago    │ │                                                           │
│ │ [Check Now] ▶   │ │                                                           │
│ │                 │ │                                                           │
│ └─────────────────┘ │                                                           │
│                     │                                                           │
├─────────────────────┴───────────────────────────────────────────────────────────┤
│                          LIVE FEED TERMINAL                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 09:15:23 Connected to monitoring system                                         │
│ 09:15:28 [Stripe Status API] transitioned to DOWN                              │
│ 09:15:29 [Gmail Health Check] transitioned to DOWN                             │
│ 09:15:30 [Zapier Webhook Runner] transitioned to DOWN                          │
│ 09:15:31 [Salesforce REST API] transitioned to DOWN                            │
│ 09:15:32 SERVICE OUTAGE DETECTED: Stripe Payments is unreachable               │
│ 09:15:33 SERVICE OUTAGE DETECTED: Gmail Business is unreachable                │
│ 09:15:34 SERVICE OUTAGE DETECTED: Zapier Automations is unreachable            │
│ 09:15:35 SERVICE OUTAGE DETECTED: Salesforce CRM is unreachable                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Alert Toast Notification (Top Right)

When endpoint goes DOWN:

```
┌──────────────────────────────────────┐
│ 🚨 CRITICAL: Stripe Payments is down │
│    Impacting Acme Corporation!       │
│                                      │
│                              ✕ Close │
└──────────────────────────────────────┘
```

When service-wide outage (100% endpoints DOWN):

```
┌──────────────────────────────────────┐
│ 🚨 SERVICE OUTAGE DETECTED            │
│    Stripe Payments is completely     │
│    unreachable. All 1 endpoint DOWN! │
│                                      │
│                              ✕ Close │
└──────────────────────────────────────┘
```

## Graph Interaction

### Before Click
```
           Acme Corporation (Blue)
                    │
            Stripe Payments (Purple)
                    │
         🔴 Stripe Status API (Red)
```

### After Click on Service
```
           Acme Corporation [SELECTED - Bright Blue]
                    │
            Stripe Payments [HIGHLIGHTED - Brighter Purple]
                    │
         🔴 Stripe Status API [HIGHLIGHTED - Brighter Red]

All connected nodes have glow effect
```

## Health Score Badge Variations

### When 0% UP (All DOWN)
```
┌────────────────────────┐
│ System Health          │
│ 0 UP / 4 DOWN          │
│        0%              │
│       🔴 RED           │
│  (Critical - needs     │
│   immediate action)    │
└────────────────────────┘
```

### When 50% UP
```
┌────────────────────────┐
│ System Health          │
│ 2 UP / 2 DOWN          │
│       50%              │
│      🟡 AMBER          │
│  (Degraded - partial   │
│   outage affecting     │
│   services)            │
└────────────────────────┘
```

### When 100% UP
```
┌────────────────────────┐
│ System Health          │
│ 4 UP / 0 DOWN          │
│       100%             │
│       🟢 GREEN         │
│  (Healthy - all        │
│   systems operational) │
└────────────────────────┘
```

## Node Color Guide

| Color | Type | Meaning |
|-------|------|---------|
| 🔵 Blue | Organization | Parent entity (always healthy) |
| 🟣 Purple | Service | Group of endpoints |
| 🟢 Green | Endpoint | Healthy (UP) |
| 🔴 Red | Endpoint | Down (DOWN) - Critical |
| 🔵 Bright Blue | Selected | Currently highlighted |
| 🔗 Gray Line | Normal Link | Standard dependency |
| 🔗 Red Line | Critical Link | Path with DOWN endpoint |
| ⚬ Red Particle | Animation | Critical path indicator |

## Export Report Modal

```
┌─────────────────────────────────────┐
│ Export Report                   ✕   │
├─────────────────────────────────────┤
│                                     │
│ Select format:                      │
│                                     │
│ ◎ JSON (with graph edges)      [✓] │
│ ◎ CSV (spreadsheet format)          │
│                                     │
│ Time range:                         │
│ Last 24 hours (226 records)         │
│                                     │
│ Includes:                           │
│ ✓ Service names                     │
│ ✓ Organization names                │
│ ✓ Status history                    │
│ ✓ Timestamps                        │
│ ✓ Graph relationships               │
│                                     │
│          [Download]   [Cancel]      │
│                                     │
└─────────────────────────────────────┘
```

## WebSocket Connection Status

Visible in browser console (F12):

```
WebSocket connected to ws://localhost:8080/api/ws
Ready for real-time alerts

Event received:
{
  "endpointId": "ep-stripe-status",
  "name": "Stripe Status API",
  "serviceName": "Stripe Payments",
  "organizationName": "Acme Corporation",
  "status": "DOWN",
  "isServiceEvent": false,
  "message": "Endpoint transitioned to DOWN",
  "timestamp": "2026-04-28T09:15:28Z"
}
```

## Mobile View (Responsive)

On smaller screens:
```
┌──────────────────────┐
│ MISSION CONTROL      │
│ API & Dependency     │
│ Dashboard            │
├──────────────────────┤
│ System Health: 0%    │
│ Status: 🔴 RED       │
├──────────────────────┤
│ ENDPOINTS            │
│ ┌─────────────────┐  │
│ │ Stripe - DOWN   │  │
│ │ [Check Now]     │  │
│ ├─────────────────┤  │
│ │ Gmail - DOWN    │  │
│ │ [Check Now]     │  │
│ ├─────────────────┤  │
│ │ Zapier - DOWN   │  │
│ │ [Check Now]     │  │
│ ├─────────────────┤  │
│ │ Salesforce -... │  │
│ │ [Check Now]     │  │
│ └─────────────────┘  │
├──────────────────────┤
│ Graph (scrollable)   │
│ [Touch to interact]  │
├──────────────────────┤
│ LIVE FEED            │
│ (Recent events)      │
└──────────────────────┘
```

---

## Summary

Your dashboard will show:

✅ **Left Panel**: 4 endpoints with "Check Now" buttons  
✅ **Right Panel**: Interactive force-directed graph with 10 nodes  
✅ **Top Badge**: Red health score (0% = all down)  
✅ **Bottom Feed**: Live event stream with timestamps  
✅ **Top Right**: Export buttons (JSON/CSV)  
✅ **Interactions**: Click nodes, drag to pan, scroll to zoom  

Everything is **live-updated** via WebSocket!

