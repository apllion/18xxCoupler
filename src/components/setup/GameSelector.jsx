import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { allTitles } from '../../titles/index.js'
import { useGameStore } from '../../store/gameStore.js'
import { useSyncContext } from '../../hooks/SyncContext.jsx'
import { loadAllGames, deleteGame, importGame, exportGame } from '../../utils/persistence.js'
import { useThemeStore, themes } from '../../store/themeStore.js'

export default function GameSelector() {
  const navigate = useNavigate()
  const loadGame = useGameStore((s) => s.loadGame)
  const importFrom18xxGames = useGameStore((s) => s.importFrom18xxGames)
  const sync = useSyncContext()
  const titles = allTitles()
  const [savedGames, setSavedGames] = useState(() => loadAllGames())
  const [view, setView] = useState('hub') // 'hub' | 'titles' | 'settings' | 'join' | 'create' | 'depot' | 'modern'
  const [showLegend, setShowLegend] = useState(null)
  const [showInfo, setShowInfo] = useState(null)

  const savedList = Object.entries(savedGames)
    .map(([key, game]) => ({ key, game }))
    .sort((a, b) => (b.game.createdAt || 0) - (a.game.createdAt || 0))

  function handleLoad(key, game) {
    loadGame(game)
    navigate('/')
  }

  function handleDelete(key) {
    deleteGame(key)
    setSavedGames(loadAllGames())
  }

  // ===== HUB VIEW =====
  if (view === 'hub') {
    return (
      <div className="min-h-screen flex flex-col items-center p-6">
        <h1 className="text-3xl font-bold text-white mt-2 tracking-wide">18xxCoupler</h1>
        <img src={import.meta.env.BASE_URL + 'logo.png'} alt="18xxCoupler"
          className="w-full max-w-md mt-1 rounded-xl" />
        <p className="text-sm text-broker-text-muted italic mb-1">Steam meets Screens</p>
        <p className="text-[10px] text-broker-text-muted mb-6">
          v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'} · {typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : '?'}
        </p>

        {/* Connected room banner */}
        {sync?.roomId && (
          <div className="w-full max-w-md mb-4 bg-broker-surface border border-broker-border rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${sync.status === 'connected' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
              <div>
                <div className="text-xs text-broker-text-muted">Compartment</div>
                <div className="font-mono font-bold text-white text-lg tracking-wider">{sync.roomId}</div>
              </div>
              <span className="text-sm text-broker-text-muted">
                {sync.peerCount > 0 ? `${sync.peerCount + 1} devices` : 'waiting...'}
              </span>
            </div>
            <button onClick={sync.leaveRoom} className="text-xs text-broker-text-muted hover:text-red-300 px-2 py-1">Leave</button>
          </div>
        )}

        {/* 3×2 Button Grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-md mb-6">
          {[
            { view: 'join', img: 'btn-join.png', label: 'Join', sub: 'Your seat awaits' },
            { view: 'create', img: 'btn-create.png', label: 'Create', sub: 'Start a room' },
            { view: 'titles', img: 'btn-build.png', label: 'Build Track', sub: 'Select a title' },
            { view: 'settings', img: 'btn-engine.png', label: 'Settings', sub: 'Theme & config' },
            { view: 'depot', img: 'btn-depot.png', label: 'Depot', sub: 'Load & import' },
            { view: 'mobile', img: 'btn-modern.png', label: 'Mobile', sub: 'Phone view' },
          ].map(b => (
            <button key={b.view} onClick={() => {
              if (b.view === 'create') { sync?.createRoom(); setView('create') }
              else setView(b.view)
            }}
              className="rounded-xl overflow-hidden hover:brightness-110 transition-all text-center">
              <img src={import.meta.env.BASE_URL + b.img} alt={b.label} className="w-full rounded-t-xl" />
              <div className="bg-broker-surface px-2 py-1.5 rounded-b-xl">
                <div className="text-sm font-bold text-white">{b.label}</div>
                <div className="text-[10px] text-broker-text-muted">{b.sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick continue — show last saved game if any */}
        {savedList.length > 0 && (
          <div className="w-full max-w-md mb-4">
            <button onClick={() => handleLoad(savedList[0].key, savedList[0].game)}
              className="w-full bg-broker-surface hover:bg-broker-surface-hover border border-broker-border rounded-lg p-3 text-left transition-colors">
              <div className="text-[10px] text-broker-text-muted uppercase tracking-wider mb-0.5">Continue</div>
              <div className="font-medium text-white">{savedList[0].game.title?.title || savedList[0].key}</div>
              <div className="text-xs text-broker-text-muted">{savedList[0].game.players?.map(p => p.name).join(', ')} · {savedList[0].game.actionLog?.length || 0} actions</div>
            </button>
          </div>
        )}

        {/* About */}
        <button onClick={() => navigate('/about')}
          className="text-xs text-broker-text-muted hover:text-broker-gold mt-4">
          About / Legal / Impressum
        </button>
      </div>
    )
  }

  // ===== JOIN VIEW =====
  if (view === 'join') {
    return <JoinView sync={sync} onBack={() => setView('hub')} />
  }

  // ===== CREATE VIEW =====
  if (view === 'create') {
    return <CreateView sync={sync} titles={titles} navigate={navigate}
      onBack={() => setView('hub')} showLegend={showLegend} setShowLegend={setShowLegend}
      showInfo={showInfo} setShowInfo={setShowInfo} />
  }

  // ===== TITLES VIEW =====
  if (view === 'titles') {
    return <TitlesView titles={titles} navigate={navigate}
      onBack={() => setView('hub')} showLegend={showLegend} setShowLegend={setShowLegend}
      showInfo={showInfo} setShowInfo={setShowInfo} />
  }

  // ===== DEPOT VIEW (load, save, import, export) =====
  if (view === 'depot') {
    return <DepotView navigate={navigate} onBack={() => setView('hub')}
      loadGame={loadGame} importFrom18xxGames={importFrom18xxGames}
      savedGames={savedGames} setSavedGames={setSavedGames} />
  }

  // ===== MOBILE VIEW (placeholder) =====
  if (view === 'mobile') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <img src={import.meta.env.BASE_URL + 'btn-modern.png'} alt="" className="w-24 rounded-xl mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Mobile View</h2>
        <p className="text-xs text-broker-text-muted mb-4">Coming soon — optimized phone layout</p>
        <button onClick={() => setView('hub')} className="text-xs text-broker-text-muted hover:text-white">← Back</button>
      </div>
    )
  }

  // ===== SETTINGS VIEW =====
  if (view === 'settings') {
    return <SettingsView navigate={navigate} onBack={() => setView('hub')} />
  }

  return null
}

// ===== JOIN VIEW =====
function JoinView({ sync, onBack }) {
  const [code, setCode] = useState('')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <img src={import.meta.env.BASE_URL + 'btn-join.png'} alt="Join" className="w-32 rounded-xl mb-4" />
      <h2 className="text-xl font-bold text-white mb-1">Join Compartment</h2>
      <p className="text-xs text-broker-text-muted mb-4">Enter the room code from your host</p>
      <div className="flex gap-2 items-center">
        <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CODE" maxLength={6} autoFocus
          onKeyDown={e => e.key === 'Enter' && code.trim().length >= 4 && sync?.joinRoom(code)}
          className="w-32 bg-broker-surface border border-broker-border rounded-lg px-3 py-3 text-white font-mono text-xl tracking-widest placeholder-broker-text-muted text-center" />
        <button onClick={() => { if (code.trim().length >= 4) sync?.joinRoom(code) }}
          disabled={code.trim().length < 4}
          className="bg-blue-700 hover:bg-blue-600 text-white px-5 py-3 rounded-lg font-bold disabled:opacity-40">
          Board
        </button>
      </div>
      <button onClick={onBack} className="mt-6 text-xs text-broker-text-muted hover:text-white">← Back</button>
    </div>
  )
}

// ===== CREATE VIEW =====
function CreateView({ sync, titles, navigate, onBack, showLegend, setShowLegend, showInfo, setShowInfo }) {
  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <img src={import.meta.env.BASE_URL + 'btn-create.png'} alt="Create" className="w-24 rounded-xl mb-3" />
      <h2 className="text-xl font-bold text-white mb-1">Create Compartment</h2>
      {sync?.roomId ? (
        <div className="flex items-center gap-3 mb-4">
          <span className={`w-3 h-3 rounded-full ${sync.status === 'connected' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
          <span className="font-mono font-bold text-white text-2xl tracking-wider">{sync.roomId}</span>
          <span className="text-sm text-broker-text-muted">
            {sync.peerCount > 0 ? `${sync.peerCount + 1} devices` : 'waiting...'}
          </span>
        </div>
      ) : (
        <p className="text-xs text-broker-text-muted mb-4">Creating room...</p>
      )}
      <p className="text-xs text-broker-text-muted mb-4">Share the code, then select a title to start</p>
      <TitlesGrid titles={titles} navigate={navigate} showLegend={showLegend} setShowLegend={setShowLegend} showInfo={showInfo} setShowInfo={setShowInfo} />
      <button onClick={onBack} className="mt-6 text-xs text-broker-text-muted hover:text-white">← Back</button>
    </div>
  )
}

// ===== TITLES GRID (shared) =====
function TitlesGrid({ titles, navigate, showLegend, setShowLegend, showInfo, setShowInfo }) {
  const [sortBy, setSortBy] = useState('rating')
  const [minRating, setMinRating] = useState(0)

  const sortFn = sortBy === 'name' ? (a, b) => a.title.localeCompare(b.title)
    : (a, b) => (b.maturity || 0) - (a.maturity || 0) || a.title.localeCompare(b.title)
  const sorted = [...titles].sort(sortFn).filter(t => (t.maturity || 0) >= minRating)

  return (
    <>
      <div className="w-full max-w-md mb-2 flex items-center justify-between">
        <SectionLabel>Select Title ({sorted.length})</SectionLabel>
        <div className="flex gap-1 items-center">
          {[['rating', 'Rating'], ['name', 'A-Z']].map(([id, label]) => (
            <button key={id} onClick={() => setSortBy(id)}
              className={`text-xs px-2 py-1 rounded ${sortBy === id
                ? 'bg-broker-gold text-broker-bg font-medium'
                : 'text-broker-text-muted hover:text-white'
              }`}>{label}</button>
          ))}
          <span className="text-broker-text-muted/30 mx-0.5">|</span>
          {[0, 1, 2, 3, 4].map(r => (
            <button key={r} onClick={() => setMinRating(minRating === r ? 0 : r)}
              className={`text-xs px-2 py-1 rounded ${minRating === r
                ? 'bg-broker-gold text-broker-bg font-medium'
                : 'text-broker-text-muted hover:text-white'
              }`}>{r}+</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {sorted.map((t) => (
          <TitleButton key={t.titleId} t={t} onClick={() => navigate(`/setup/${t.titleId}`)}
            onShowLegend={setShowLegend} onShowInfo={setShowInfo} />
        ))}
      </div>
      {sorted.length === 0 && (
        <div className="text-xs text-broker-text-muted w-full max-w-md text-center py-4">
          No titles at this rating. <button onClick={() => setMinRating(0)} className="underline">Show all</button>
        </div>
      )}
      {showLegend && <WrenchLegend title={showLegend === true ? null : showLegend} onClose={() => setShowLegend(null)} />}
      {showInfo && <TitleInfoPopup title={showInfo} onClose={() => setShowInfo(null)} />}
    </>
  )
}

// ===== TITLES VIEW =====
function TitlesView({ titles, navigate, onBack, showLegend, setShowLegend, showInfo, setShowInfo }) {
  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-md mb-2 flex items-center gap-2">
        <button onClick={onBack} className="text-broker-text-muted hover:text-white text-sm">←</button>
        <img src={import.meta.env.BASE_URL + 'btn-build.png'} alt="" className="w-8 rounded" />
        <h2 className="text-lg font-bold text-white">Build Track</h2>
      </div>
      <TitlesGrid titles={titles} navigate={navigate} showLegend={showLegend} setShowLegend={setShowLegend} showInfo={showInfo} setShowInfo={setShowInfo} />
      <button onClick={onBack} className="mt-6 text-xs text-broker-text-muted hover:text-white">← Back</button>
    </div>
  )
}

// ===== DEPOT VIEW (saved games, load/save/import/export) =====
function DepotView({ navigate, onBack, loadGame, importFrom18xxGames, savedGames, setSavedGames }) {
  const fileRef = useRef(null)
  const [importId, setImportId] = useState('')
  const [importError, setImportError] = useState(null)
  const [importing, setImporting] = useState(false)
  const savedList = Object.entries(savedGames)
    .map(([key, game]) => ({ key, game }))
    .sort((a, b) => (b.game.createdAt || 0) - (a.game.createdAt || 0))

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = importGame(reader.result)
        loadGame(data)
        navigate('/')
      } catch (err) { console.error('Failed to import game:', err) }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="text-broker-text-muted hover:text-white text-sm">←</button>
          <img src={import.meta.env.BASE_URL + 'btn-depot.png'} alt="" className="w-8 rounded" />
          <h2 className="text-lg font-bold text-white">Depot</h2>
        </div>

        {/* Saved Games */}
        {savedList.length > 0 ? (
          <div className="space-y-2 mb-4">
            <SectionLabel>Saved Games</SectionLabel>
            {savedList.map(({ key, game }) => {
              const date = game.createdAt ? new Date(game.createdAt).toLocaleDateString() : '—'
              const players = game.players?.map((p) => p.name).join(', ') || '—'
              const actions = game.actionLog?.length || 0
              return (
                <div key={key} className="bg-broker-surface border border-broker-border rounded-lg p-3 flex items-center justify-between">
                  <button onClick={() => { loadGame(game); navigate('/') }} className="flex-1 text-left hover:text-broker-gold transition-colors">
                    <div className="font-medium">{game.title?.title || key} <span className="text-broker-text-muted text-sm ml-2">{date}</span></div>
                    <div className="text-xs text-broker-text-muted">{players} · {actions} actions</div>
                  </button>
                  <button onClick={(e) => {
                    e.stopPropagation()
                    const json = exportGame(game)
                    const blob = new Blob([json], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${game.title?.titleId || 'game'}_${new Date(game.createdAt).toISOString().slice(0, 10)}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }} className="text-broker-text-muted hover:text-broker-gold ml-2 px-2 py-1 text-xs" title="Export">↓</button>
                  <button onClick={() => { deleteGame(key); setSavedGames(loadAllGames()) }}
                    className="text-broker-text-muted hover:text-red-400 px-2 py-1 text-sm" title="Delete">×</button>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-broker-text-muted mb-4">No saved games</p>
        )}

        {/* Load from file */}
        <SectionLabel>Import</SectionLabel>
        <button onClick={() => fileRef.current?.click()}
          className="w-full bg-broker-surface hover:bg-broker-surface-hover border border-dashed border-broker-border rounded-lg py-3 text-sm text-broker-text-muted hover:text-white transition-colors mb-2">
          Load from JSON file
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

        {/* 18xx.games import */}
        <div className="bg-broker-surface border border-broker-border rounded-lg p-3 mb-2">
          <div className="text-xs text-broker-text-muted mb-2">From 18xx.games</div>
          <div className="flex gap-2">
            <input type="text" value={importId}
              onChange={(e) => { setImportId(e.target.value.replace(/\D/g, '')); setImportError(null) }}
              placeholder="Game ID"
              className="flex-1 bg-broker-bg border border-broker-border rounded px-3 py-2 text-sm text-white placeholder-broker-text-muted font-mono" />
            <button
              onClick={async () => {
                if (!importId || importing) return
                setImporting(true); setImportError(null)
                try { await importFrom18xxGames(parseInt(importId, 10)); navigate('/') }
                catch (err) { setImportError(err.message) }
                finally { setImporting(false) }
              }}
              disabled={!importId || importing}
              className="bg-purple-800 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm disabled:opacity-40">
              {importing ? '...' : 'Import'}
            </button>
          </div>
          {importError && <div className="text-xs text-red-400 mt-2">{importError}</div>}
          <LiveGames onImport={async (id) => {
            setImporting(true); setImportError(null)
            try { await importFrom18xxGames(id); navigate('/') }
            catch (err) { setImportError(err.message) }
            finally { setImporting(false) }
          }} importing={importing} />
        </div>

        <button onClick={onBack} className="mt-4 text-xs text-broker-text-muted hover:text-white w-full text-center">← Back</button>
      </div>
    </div>
  )
}

// ===== SETTINGS VIEW =====
function SettingsView({ navigate, onBack }) {
  const themeId = useThemeStore((s) => s.themeId)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="text-broker-text-muted hover:text-white text-sm">←</button>
          <img src={import.meta.env.BASE_URL + 'btn-engine.png'} alt="" className="w-8 rounded" />
          <h2 className="text-lg font-bold text-white">Settings</h2>
        </div>

        <SectionLabel>Theme</SectionLabel>
        <div className="flex gap-1 mb-6">
          {Object.values(themes).map((t) => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={`text-sm px-3 py-1.5 rounded transition-colors ${
                themeId === t.id
                  ? 'bg-broker-gold text-broker-bg font-medium'
                  : 'bg-broker-surface text-broker-text-muted hover:bg-broker-surface-hover'
              }`} title={t.desc}>{t.label}</button>
          ))}
        </div>

        <SectionLabel>Tools</SectionLabel>
        <div className="space-y-2 mb-6">
          <button onClick={() => navigate('/routes')}
            className="w-full bg-broker-surface hover:bg-broker-surface-hover text-broker-text hover:text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors text-left">
            Route Calculator
          </button>
          <button onClick={() => navigate('/endgame')}
            className="w-full bg-broker-surface hover:bg-broker-surface-hover text-broker-text hover:text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors text-left">
            Endgame Calculator
          </button>
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => navigate('/about')}
            className="text-xs text-broker-text-muted hover:text-broker-gold">
            About / Legal / Impressum
          </button>
        </div>

        <button onClick={onBack} className="mt-4 text-xs text-broker-text-muted hover:text-white w-full text-center">← Back</button>
      </div>
    </div>
  )
}

// ===== SHARED COMPONENTS =====

function SectionLabel({ children }) {
  return <div className="text-[10px] text-broker-text-muted uppercase tracking-widest mb-1">{children}</div>
}

const WRENCH_LABELS = [
  'Not verified',
  'Config exists, complex mechanics',
  'Verified against Ruby/PDF',
  'Verified, standard mechanics',
  'Import-tested against engine',
  'Human-verified at the table',
]

function TrackIcon({ filled, size = 'w-3 h-3' }) {
  return (
    <svg className={`${size} ${filled ? 'text-broker-gold' : 'text-broker-text-muted/20'}`}
      viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="0" y="4" width="24" height="2.5" rx="1" />
      <rect x="0" y="17.5" width="24" height="2.5" rx="1" />
      <rect x="3" y="1" width="2.5" height="22" rx="0.5" />
      <rect x="10.75" y="1" width="2.5" height="22" rx="0.5" />
      <rect x="18.5" y="1" width="2.5" height="22" rx="0.5" />
    </svg>
  )
}

function WrenchIcon({ filled, size = 'w-3 h-3' }) {
  return (
    <svg className={`${size} ${filled ? 'text-broker-gold' : 'text-broker-text-muted/20'}`}
      viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  )
}

function WrenchLegend({ title, onClose }) {
  if (!title?.implemented) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-broker-bg border border-broker-border rounded-lg p-4 shadow-xl w-80 max-w-[90vw]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-broker-text font-bold">{title.title}</span>
          <span className="flex gap-px">
            {Array.from({ length: 5 }, (_, i) => <WrenchIcon key={i} filled={i < (title.maturity || 0)} />)}
          </span>
          <span className="flex gap-px items-center">
            {Array.from({ length: 5 }, (_, i) => <TrackIcon key={i} filled={i < (title.testQuality || 0)} />)}
          </span>
        </div>
        <div className="text-xs text-broker-text space-y-0.5">
          {title.implemented.split('•').filter(s => s.trim()).map((line, i) => (
            <div key={i} className="flex gap-1">
              <span className="text-green-400">✓</span>
              <span>{line.trim()}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose}
          className="mt-3 w-full text-xs text-broker-text-muted hover:text-broker-text py-2 px-3">Close</button>
      </div>
    </div>
  )
}

function TitleInfoPopup({ title, onClose }) {
  const t = title
  const rows = [
    ['Cap', (t.capitalization || 'full') === 'incremental' ? 'Incremental' : 'Full'],
    ['Float', (t.floatPercent || 60) + '%'],
    ['Shares', (() => { const s = t.shares || [20, 10]; return s[0] + '/' + (s[1] || s[0]) + ' ×' + s.length })()],
    ['Sell move', (t.sellMovement || 'down_share').replace(/_/g, ' ')],
    ['Sell after', (t.sellAfter || 'first SR').replace(/_/g, ' ')],
    ['Unsold div', (t.unsoldShareDividends || 'market') + ' → corp'],
    ['Pool limit', (t.marketShareLimit != null ? t.marketShareLimit : 50) + '%'],
    ['Sell order', (t.sellBuyOrder || 'sell_buy').replace(/_/g, ' ')],
  ]
  if (t.maxOwnership) rows.push(['Max own', (typeof t.maxOwnership === 'number' ? t.maxOwnership + '%' : 'varies')])
  if (t.dividendMovement && t.dividendMovement !== 'standard') rows.push(['Div move', t.dividendMovement.replace(/_/g, ' ')])
  if (t.halfPay) rows.push(['Half pay', '✓'])
  if (t.loans) rows.push(['Loans', '✓'])
  if (t.shorts) rows.push(['Shorts', '✓'])
  if (t.corpCanBuyShares) rows.push(['Corp trade', '✓'])
  if (t.merger) rows.push(['Merger', t.merger.type.replace(/_/g, ' ')])
  if (t.terrainCosts?.length > 0) rows.push(['Terrain', t.terrainCosts.join(', ')])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-broker-bg border border-broker-border rounded-lg p-4 shadow-xl w-80 max-w-[90vw]"
        onClick={e => e.stopPropagation()}>
        <div className="text-sm text-white font-bold mb-1">{t.title}</div>
        <div className="text-xs text-broker-text-muted mb-3">{t.subtitle}</div>
        {t.specialties && (
          <div className="text-xs text-broker-text space-y-0.5">
            {t.specialties.split('•').filter(s => s.trim()).map((line, i) => (
              <div key={i} className="flex gap-1">
                <span className="text-broker-gold">•</span>
                <span>{line.trim()}</span>
              </div>
            ))}
          </div>
        )}
        <div className="text-[10px] text-broker-text-muted mt-2">
          {t.minPlayers}–{t.maxPlayers} players • {t.designer} • {t.location}
        </div>
        <div className="mt-3 border-t border-broker-border pt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
          {rows.map(([k, v]) => (
            <div key={k}><span className="text-broker-text-muted">{k}:</span> <span className="text-white">{v}</span></div>
          ))}
        </div>
        <button onClick={onClose}
          className="mt-3 w-full text-xs text-broker-text-muted hover:text-white py-2 px-3">Close</button>
      </div>
    </div>
  )
}

function TitleButton({ t, onClick, onShowLegend, onShowInfo }) {
  const m = t.maturity || 0
  return (
    <button onClick={onClick}
      className="bg-broker-surface hover:bg-broker-surface-hover border border-broker-border rounded-lg p-4 text-left transition-colors relative overflow-hidden">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-broker-text">{t.title}</span>
        {t.gameInfo && (
          <span onClick={e => { e.stopPropagation(); onShowInfo?.(t) }}
            className="p-1 text-broker-text-muted/40 hover:text-broker-gold cursor-pointer" title="Game info">
            <svg className="w-6 h-6 inline" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 2C9.5 2 8 3.5 8 5c0 .5.1 1 .3 1.4L7 8h10l-1.3-1.6c.2-.4.3-.9.3-1.4 0-1.5-1.5-3-4-3zM6 9v2h1v7H6v2h12v-2h-1v-7h1V9H6zm4 2h4v7h-4v-7z"/>
            </svg>
          </span>
        )}
      </div>
      <div className="text-sm text-broker-text-muted mt-1">{t.subtitle}</div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-broker-text-muted">{t.minPlayers}–{t.maxPlayers} players</span>
        <span className="flex gap-2 items-center">
          <span onClick={e => { e.stopPropagation(); onShowLegend?.(t) }}
            className="flex gap-px items-center cursor-pointer" title={t.implemented || WRENCH_LABELS[m]}>
            {Array.from({ length: 5 }, (_, i) => <WrenchIcon key={i} filled={i < m} />)}
          </span>
          <span className="flex gap-px items-center" title="Test coverage">
            {Array.from({ length: 5 }, (_, i) => <TrackIcon key={i} filled={i < (t.testQuality || 0)} />)}
          </span>
        </span>
      </div>
    </button>
  )
}

const SUPPORTED_TITLES = new Set([
  '1817', '1822', '1822CA', '1822MX', '1830', '1846', '1847 AE', '1849', '1858', '1860',
  '1861', '1862', '1867', '1871', '1880', '1889',
  '18Chesapeake', '18GB', '18India', '18Ireland', '18MEX', '18MS', '18RHL', '18 Royal Gorge', '18SJ', '18USA',
  '21Moon', '22Mars',
])

const SORTED_TITLES = [...SUPPORTED_TITLES].sort()

function LiveGames({ onImport, importing }) {
  const [games, setGames] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('active')
  const [titleFilter, setTitleFilter] = useState('')

  function fetchGames(status, title) {
    setLoading(true); setError(null); setTab(status)
    const base = import.meta.env.VITE_18XX_API || '/18xx-games-api'
    const url = title
      ? `${base}/game?title=${encodeURIComponent(title)}&status=${status}&page=1`
      : `${base}/game?status=${status}&page=1`
    fetch(url)
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })
      .then(data => {
        const supported = (data.games || []).filter(g => SUPPORTED_TITLES.has(g.title))
        setGames(supported.slice(0, 30))
      })
      .catch(() => setError('Could not reach 18xx.games'))
      .finally(() => setLoading(false))
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <select value={titleFilter} onChange={e => setTitleFilter(e.target.value)}
          className="text-xs bg-broker-bg border border-broker-border rounded px-2 py-1 text-white">
          <option value="">All titles</option>
          {SORTED_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => fetchGames('active', titleFilter)}
          className={`text-xs px-2 py-0.5 rounded ${tab === 'active' && games ? 'bg-green-800 text-green-200' : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'}`}>
          Active
        </button>
        <button onClick={() => fetchGames('finished', titleFilter)}
          className={`text-xs px-2 py-0.5 rounded ${tab === 'finished' && games ? 'bg-blue-800 text-blue-200' : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'}`}>
          Finished
        </button>
        {loading && <span className="text-xs text-broker-text-muted animate-pulse">Loading...</span>}
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}
      {games && games.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {games.map(g => (
            <div key={g.id} className="flex items-center justify-between bg-broker-bg rounded px-2 py-1.5 text-xs hover:bg-broker-surface-hover/50">
              <div className="flex-1 min-w-0">
                <span className="font-bold text-white">{g.title}</span>
                <span className="text-broker-text-muted ml-1">#{g.id}</span>
                <span className="text-broker-text-muted ml-1">{g.players.length}p</span>
                <span className="text-broker-text-muted ml-1 truncate">{g.players.map(p => p.name).join(', ')}</span>
              </div>
              <button onClick={() => onImport(g.id)} disabled={importing}
                className="text-xs bg-purple-800 hover:bg-purple-700 text-white px-2 py-0.5 rounded ml-2 disabled:opacity-40 flex-shrink-0">
                Load
              </button>
            </div>
          ))}
        </div>
      )}
      {games && games.length === 0 && <div className="text-xs text-broker-text-muted">No supported games found</div>}
    </div>
  )
}
