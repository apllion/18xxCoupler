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
    { id: 'overview', label: 'Overview', icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    )},
    { id: 'corps', label: 'Corps', icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
      </svg>
    )},
    { id: 'players', label: 'Players', icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )},
  ]

  const hasLoans = !!game?.title?.loans
  const hasCards = game?.title?.strategyCards?.length > 0

  const moreItems = [
    { id: 'market', label: 'Stock Market' },
    { id: 'rounds', label: 'Rounds & Turns' },
    ...(hasPrivates ? [{ id: 'privates', label: 'Private Companies' }] : []),
    ...(hasBeer ? [{ id: 'beer', label: 'Beer Market' }] : []),
    ...(hasLoans ? [{ id: 'loanchart', label: 'Loan Chart' }] : []),
    ...(hasCards ? [{ id: 'cards', label: 'Strategy Cards' }] : []),
    { id: 'routes', label: 'Route Calculator' },
    { id: 'endgame', label: 'Endgame Calculator' },
    { id: 'log', label: 'Action Log' },
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
            className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === tab.id
                ? 'text-broker-gold'
                : 'text-broker-text-muted hover:text-broker-text'
            }`}>
            {tab.icon}
            <span className="text-[10px]">{tab.label}</span>
          </button>
        ))}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 transition-colors ${
            isMore || menuOpen
              ? 'text-broker-gold'
              : 'text-broker-text-muted hover:text-broker-text'
          }`}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          <span className="text-[10px]">{isMore ? moreItems.find(m => m.id === activeTab)?.label?.split(' ')[0] || 'More' : 'More'}</span>
        </button>
      </nav>
    </>
  )
}
