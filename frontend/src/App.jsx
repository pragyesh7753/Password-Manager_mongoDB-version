import Navbar from './components/Navbar'
import Manager from './components/Manager'
import Footer from './components/Footer'

function App() {
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
