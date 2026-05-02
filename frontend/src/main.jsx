import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('main.jsx loaded')

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found')
  document.body.innerHTML = '<div style="color: red; padding: 20px;">Error: Root element not found</div>'
} else {
  try {
    console.log('Creating React root')
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    console.log('React app mounted')
  } catch (error) {
    console.error('Failed to render React app:', error)
    rootElement.innerHTML = '<div style="color: red; padding: 20px; font-family: monospace;"><strong>Error rendering app:</strong><br />' + error.message + '</div>'
  }
}
