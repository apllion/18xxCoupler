import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'

const HOME_TAB = { id: 'overview', label: '\u2302 Overview' }

const CORE_TABS = [
  { id: 'market', label: 'Market' },
  { id: 'corps', label: 'Corps' },
  { id: 'players', label: 'Players' },
]

const PRIVATES_TAB = { id: 'privates', label: 'Privates' }
const BEER_TAB = { id: 'beer', label: 'Beer' }
const ANALYSIS_TAB = { id: 'analysis', label: '++ Analysis' }
const SUMMARY_TAB = { id: 'summary', label: 'Summary' }

export default function BottomNav() {
  const game = useGameStore((s) => s.game)
  const activeTab = useUIStore((s) => s.activeTab)
  const setActiveTab = useUIStore((s) => s.setActiveTab)
  const plusPlus = useUIStore((s) => s.plusPlus)

  const hasBeer = game?.beerMarket != null
  const hasPrivates = game?.companies?.length > 0
  const tabs = [
    HOME_TAB,
    ...CORE_TABS,
    ...(hasPrivates ? [PRIVATES_TAB] : []),
    ...(hasBeer ? [BEER_TAB] : []),
    ...(plusPlus ? [ANALYSIS_TAB] : []),
    SUMMARY_TAB,
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-broker-surface border-t border-broker-border flex z-20">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'text-white bg-broker-surface-hover'
              : 'text-broker-text-muted hover:text-broker-text'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
