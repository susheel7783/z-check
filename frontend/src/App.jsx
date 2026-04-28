import Dashboard from './components/Dashboard'
import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <>
      <Dashboard />
      <Toaster position="top-right" reverseOrder={false} />
    </>
  )
}

export default App
