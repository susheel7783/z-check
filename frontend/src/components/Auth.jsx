import { useState } from 'react'
import { toast } from 'react-hot-toast'

export default function Auth({ apiBase, onLogin }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup'
  const buttonLabel = mode === 'login' ? 'Sign In' : 'Sign Up'
  const switchLabel = mode === 'login' ? 'Create an account' : 'Already have an account?'

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!username || !password) {
      toast.error('Username and password are required')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const payload = await res.json()
      if (!res.ok) {
        toast.error(payload.error || 'Authentication failed')
        return
      }

      if (mode === 'login') {
        onLogin(payload.token, username)
        toast.success('Signed in successfully')
      } else {
        toast.success('Account created; please sign in')
        setMode('login')
      }
    } catch (error) {
      console.error('Auth error', error)
      toast.error('Unable to reach the backend')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800/70 bg-slate-900/60 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Z-Check Access</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">{mode === 'login' ? 'Sign In' : 'Create Account'}</h1>
          <p className="mt-2 text-slate-400">Use your credentials to access the monitoring dashboard.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-300">Username</label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="admin"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Password</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Working…' : buttonLabel}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800 pt-4 text-center text-sm text-slate-400">
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="font-semibold text-sky-400 hover:text-sky-300"
          >
            {switchLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
