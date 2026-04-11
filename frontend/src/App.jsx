import { useAuth } from '@clerk/clerk-react'
import AuthPanel from './components/AuthPanel'
import Navbar from './components/Navbar'
import Manager from './components/Manager'
import Footer from './components/Footer'

function App() {
  const { isLoaded, userId } = useAuth()

  if (!isLoaded) {
    return (
      <div className="h-dvh flex items-center justify-center bg-green-50 text-green-800 font-semibold">
        Loading secure workspace...
      </div>
    )
  }

  if (!userId) {
    return <AuthPanel />
  }

  return (
    <div className="h-dvh overflow-hidden flex flex-col">
      <Navbar />
      <main className="flex-1 min-h-0 overflow-hidden">
        <Manager />
      </main>
      <Footer />
    </div>
  )
}

export default App
