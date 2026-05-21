import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useGameStore } from './store/gameStore.js'
import { useSyncContext } from './hooks/SyncContext.jsx'
import GameSelector from './components/setup/GameSelector.jsx'
import PlayerSetup from './components/setup/PlayerSetup.jsx'
import GameShell from './components/layout/GameShell.jsx'
import AboutPage from './components/setup/AboutPage.jsx'

const ACCESS_KEY = '18xx2026'
const STORAGE_KEY = '18xxBroker_access'

function useAccess() {
  const [granted, setGranted] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === ACCESS_KEY } catch { return false }
  })
  const grant = (key) => {
    if (key === ACCESS_KEY) {
      localStorage.setItem(STORAGE_KEY, key)
      setGranted(true)
      return true
    }
    return false
  }
  return { granted, grant }
}

export default function App() {
  const access = useAccess()
  const [accessInput, setAccessInput] = useState('')
  const [accessError, setAccessError] = useState(false)

  if (!access.granted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-broker-bg text-broker-text">
        <img src={import.meta.env.BASE_URL + 'logo.png'} alt="18xxBroker" className="w-32 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-1">18xxBroker</h1>
        <p className="text-broker-text-muted text-sm mb-6">Early access — enter passphrase</p>
        <div className="flex gap-2">
          <input type="password" value={accessInput} onChange={e => { setAccessInput(e.target.value); setAccessError(false) }}
            placeholder="Passphrase"
            className="bg-broker-surface border border-broker-border rounded px-3 py-2 text-white text-center"
            onKeyDown={e => { if (e.key === 'Enter') { if (!access.grant(accessInput)) setAccessError(true) } }}
          />
          <button onClick={() => { if (!access.grant(accessInput)) setAccessError(true) }}
            className="bg-broker-gold/20 text-broker-gold px-4 py-2 rounded hover:bg-broker-gold/30">
            Enter
          </button>
        </div>
        {accessError && <p className="text-red-400 text-sm mt-2">Wrong passphrase</p>}
        <p className="text-xs text-broker-text-muted mt-8 max-w-sm text-center">
          Private non-commercial hobby project. Not affiliated with any game publisher.
        </p>
      </div>
    )
  }
  const game = useGameStore((s) => s.game)
  const sync = useSyncContext()

  // In a room but no game yet — waiting for host to send state
  if (!game && sync?.roomId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className={`w-4 h-4 rounded-full mx-auto ${
            sync.status === 'connected' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
          }`} />
          <div>
            <div className="text-lg font-medium">Joining room</div>
            <div className="font-mono text-2xl font-bold tracking-widest mt-1">{sync.roomId}</div>
          </div>
          <div className="text-sm text-broker-text-muted">
            {sync.status === 'connected'
              ? `Connected to ${sync.peerCount} device${sync.peerCount !== 1 ? 's' : ''} — waiting for game...`
              : 'Connecting...'}
          </div>
          <button
            onClick={sync.leaveRoom}
            className="text-sm text-broker-text-muted hover:text-red-300 mt-4"
          >
            Leave Room
          </button>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <Routes>
        <Route path="/" element={<GameSelector />} />
        <Route path="/setup/:titleId" element={<PlayerSetup />} />
        <Route path="/about" element={<AboutPage onEnter={() => window.history.back()} />} />
      </Routes>
    )
  }

  return <GameShell />
}
