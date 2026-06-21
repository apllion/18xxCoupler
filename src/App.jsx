import { Routes, Route } from 'react-router-dom'
import { useGameStore } from './store/gameStore.js'
import { useSyncContext } from './hooks/SyncContext.jsx'
import GameSelector from './components/setup/GameSelector.jsx'
import PlayerSetup from './components/setup/PlayerSetup.jsx'
import UmpireShell from './components/layout/UmpireShell.jsx'
import DriverShell from './components/driver/DriverShell.jsx'
import { useUIStore } from './store/uiStore.js'
import AboutPage from './components/setup/AboutPage.jsx'
import PassphraseGate from './components/setup/PassphraseGate.jsx'
import EndgameCalcTab from './components/overview/EndgameCalcTab.jsx'
import RouteCalcTab from './components/overview/RouteCalcTab.jsx'

export default function App() {
  const game = useGameStore((s) => s.game)
  const sync = useSyncContext()

  return (
    <PassphraseGate>
      <AppContent game={game} sync={sync} />
    </PassphraseGate>
  )
}

function AppContent({ game, sync }) {

  // In a room as joiner but no game yet — waiting for host to send state
  if (!game && sync?.roomId && !sync?.isCreator) {
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
            ← Cancel & Leave Room
          </button>
        </div>
      </div>
    )
  }

  const viewMode = useUIStore((s) => s.viewMode)
  const readyToPlay = useUIStore((s) => s.readyToPlay)

  // Game loaded and user picked Umpire/Driver → play
  if (game && readyToPlay) {
    return viewMode === 'driver' ? <DriverShell /> : <UmpireShell />
  }

  // No game, or game loaded but user still on hub (needs to pick view)
  return (
    <Routes>
      <Route path="/" element={<GameSelector />} />
      <Route path="/setup/:titleId" element={<PlayerSetup />} />
      <Route path="/endgame" element={<CalcStandalone><EndgameCalcTab /></CalcStandalone>} />
      <Route path="/routes" element={<CalcStandalone><RouteCalcTab /></CalcStandalone>} />
      <Route path="/about" element={<AboutPage onEnter={() => window.history.back()} />} />
    </Routes>
  )
}

function CalcStandalone({ children }) {
  return (
    <div className="min-h-screen bg-broker-bg">
      <div className="flex items-center justify-between p-3 border-b border-broker-border">
        <button onClick={() => window.history.back()} className="text-sm text-broker-text-muted hover:text-white">← Back</button>
      </div>
      {children}
    </div>
  )
}
