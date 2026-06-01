import { useState } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'

const PP = !!import.meta.env.VITE_PLUSPLUS || import.meta.env.DEV

export default function BottomNav() {
  const game = useGameStore((s) => s.game)
  const activeTab = useUIStore((s) => s.activeTab)
  const setActiveTab = useUIStore((s) => s.setActiveTab)
  const [menuOpen, setMenuOpen] = useState(false)

  const hasBeer = game?.beerMarket != null
  const hasPrivates = game?.companies?.length > 0

  const mainTabs = [
    { id: 'overview', label: '⌂' },
    { id: 'corps', label: 'Corps' },
    { id: 'players', label: 'Players' },
  ]

  const moreItems = [
    { id: 'market', label: 'Stock Market' },
    ...(hasPrivates ? [{ id: 'privates', label: 'Private Companies' }] : []),
    ...(hasBeer ? [{ id: 'beer', label: 'Beer Market' }] : []),
    { id: 'routes', label: 'Route Calculator' },
    { id: 'endgame', label: 'Endgame Calculator' },
    ...(PP ? [{ id: 'analysis', label: '++ Analysis' }] : []),
  ]

  const isMore = moreItems.some(m => m.id === activeTab)

  return (
    <>
      {/* More menu — slide up */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end" onClick={() => setMenuOpen(false)}>
          <div className="bg-broker-surface border-t border-broker-border rounded-t-xl shadow-xl pb-14"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-2 border-b border-broker-border">
              <span className="text-sm font-medium text-broker-text">More</span>
              <button onClick={() => setMenuOpen(false)} className="text-broker-text-muted hover:text-broker-text px-2">×</button>
            </div>
            <div className="py-1">
              {moreItems.map(item => (
                <button key={item.id}
                  onClick={() => { setActiveTab(item.id); setMenuOpen(false) }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    activeTab === item.id
                      ? 'text-white bg-broker-surface-hover font-medium'
                      : 'text-broker-text-muted hover:text-broker-text hover:bg-broker-surface-hover/50'
                  }`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav — 3 tabs + more */}
      <nav className="fixed bottom-0 left-0 right-0 bg-broker-surface border-t border-broker-border flex z-20">
        {mainTabs.map(tab => (
          <button key={tab.id}
            onClick={() => { setActiveTab(tab.id); setMenuOpen(false) }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white bg-broker-surface-hover'
                : 'text-broker-text-muted hover:text-broker-text'
            }`}>
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            isMore || menuOpen
              ? 'text-white bg-broker-surface-hover'
              : 'text-broker-text-muted hover:text-broker-text'
          }`}>
          {isMore ? moreItems.find(m => m.id === activeTab)?.label?.split(' ')[0] || '☰' : '☰'}
        </button>
      </nav>
    </>
  )
}
