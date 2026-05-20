// ModeratorShell — terminal chrome for detail tab views in Moderator skin.
// Wraps any tab component in retro-styled header + nav.

import { useUIStore } from '../../store/uiStore.js'
import { useGameStore } from '../../store/gameStore.js'
import { formatCurrency } from '../../utils/currency.js'
import { currentPhase } from '../../engine/phase.js'
import { roundLabel } from '../../engine/roundTracker.js'

const TABS = [
  { key: 'F1', id: 'moderator', label: 'Overview' },
  { key: 'F3', id: 'corps', label: 'Corps' },
  { key: 'F4', id: 'players', label: 'Players' },
  { key: 'F5', id: 'privates', label: 'Privates' },
  { key: 'F6', id: 'summary', label: 'Summary' },
  { key: 'F2', id: 'market', label: 'Market' },
]

export default function ModeratorShell({ game, activeTab, children }) {
  const setActiveTab = useUIStore((s) => s.setActiveTab)
  const undo = useGameStore((s) => s.undo)
  const canUndo = useGameStore((s) => s.canUndo)

  if (!game) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const phase = currentPhase(game.phaseManager)
  const label = game.roundTracker ? roundLabel(game.roundTracker) : ''

  return (
    <>
      {/* Title bar */}
      <div className="bg-blue-900 text-blue-200 px-2 py-1 flex justify-between flex-shrink-0 font-mono text-xs">
        <span>
          <span className="text-white font-bold">{game.title.title}</span>
          <span className="text-green-300 font-bold ml-2">{label}</span>
          <span className="text-cyan-300 ml-2">Ph.{phase.name}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className={game.bank.cash <= 0 ? 'text-red-400 font-bold' : 'text-green-300'}>Bank:{fmt(game.bank.cash)}</span>
          <button onClick={() => canUndo() && undo()} className="text-blue-400 hover:text-white">[U]ndo</button>
        </span>
      </div>

      {/* Nav tabs */}
      <div className="bg-blue-950 px-2 py-0.5 flex items-center gap-1 flex-shrink-0 border-b border-blue-800 font-mono text-xs">
        {TABS.filter(t => t.id !== 'privates' || game.companies?.length > 0).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-1.5 py-0.5 ${activeTab === tab.id ? 'text-white font-bold' : 'text-blue-400 hover:text-white'}`}>
            {tab.key}:{tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-blue-950">
        {children}
      </main>
    </>
  )
}
