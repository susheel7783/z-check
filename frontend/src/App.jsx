import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import Auth from './components/Auth'
import { Toaster } from 'react-hot-toast'

function App() {
  const [token, setToken] = useState(null)
  const [username, setUsername] = useState('')
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const storedToken = localStorage.getItem('ZCHECK_TOKEN')
    const storedUser = localStorage.getItem('ZCHECK_USER')
    if (storedToken) setToken(storedToken)
    if (storedUser) setUsername(storedUser)
    const storedTheme = localStorage.getItem('ZCHECK_THEME')
    if (storedTheme) setTheme(storedTheme)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light')
    localStorage.setItem('ZCHECK_THEME', theme)
  }, [theme])

  const handleLogin = (newToken, user) => {
    localStorage.setItem('ZCHECK_TOKEN', newToken)
    localStorage.setItem('ZCHECK_USER', user)
    setToken(newToken)
    setUsername(user)
  }

  const handleLogout = () => {
    localStorage.removeItem('ZCHECK_TOKEN')
    localStorage.removeItem('ZCHECK_USER')
    setToken(null)
    setUsername('')
  }

  return (
    <>
      {token ? (
        <Dashboard token={token} username={username} theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onLogout={handleLogout} />
      ) : (
        <Auth apiBase={import.meta.env.VITE_API_URL || 'http://localhost:8080'} onLogin={handleLogin} />
      )}
      <Toaster position="top-right" reverseOrder={false} />
    </>
  )
}

export default App
