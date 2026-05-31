import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { allTitles } from '../../titles/index.js'
import { useGameStore } from '../../store/gameStore.js'
import { useSyncContext } from '../../hooks/SyncContext.jsx'
import { loadAllGames, deleteGame, importGame } from '../../utils/persistence.js'
import { useThemeStore, themes } from '../../store/themeStore.js'

export default function GameSelector() {
  const navigate = useNavigate()
  const loadGame = useGameStore((s) => s.loadGame)
  const importFrom18xxGames = useGameStore((s) => s.importFrom18xxGames)
  const sync = useSyncContext()
  const titles = allTitles()
  const [savedGames, setSavedGames] = useState(() => loadAllGames())
  const [importId, setImportId] = useState('')
  const [importError, setImportError] = useState(null)
  const [importing, setImporting] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [sortBy, setSortBy] = useState('rating')
  const [showLegend, setShowLegend] = useState(false)
  const [showInfo, setShowInfo] = useState(null) // title object

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

  const fileRef = useRef(null)
  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = importGame(reader.result)
        loadGame(data)
        navigate('/')
      } catch (err) {
        console.error('Failed to import game:', err)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const themeId = useThemeStore((s) => s.themeId)
  const setTheme = useThemeStore((s) => s.setTheme)

  const [minRating, setMinRating] = useState(0)

  // Sort titles
  const sortFn = sortBy === 'name' ? (a, b) => a.title.localeCompare(b.title)
    : (a, b) => (b.maturity || 0) - (a.maturity || 0) || a.title.localeCompare(b.title)
  const sorted = [...titles].sort(sortFn).filter(t => (t.maturity || 0) >= minRating)

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      {/* Theme switcher */}
      <div className="self-end flex gap-1 mb-2">
        {Object.values(themes).map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`text-sm px-3 py-1.5 rounded transition-colors ${
              themeId === t.id
                ? 'bg-broker-gold text-broker-bg font-medium'
                : 'bg-broker-surface text-broker-text-muted hover:bg-broker-surface-hover'
            }`}
            title={t.desc}
          >
            {t.label}
          </button>
        ))}
      </div>

      <img src={import.meta.env.BASE_URL + 'logo.png'} alt="18xxCoupler"
        className="w-full max-w-md mt-2 mb-1 rounded-xl" />
      <p className="text-[10px] text-broker-text-muted mb-6">
        v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'} · {typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : '?'}
      </p>

      {/* ===== TOOLS ===== */}
      <div className="w-full max-w-md space-y-2 mb-6">
        <SectionLabel>Tools</SectionLabel>
        <button onClick={() => navigate('/routes')}
          className="w-full bg-broker-surface hover:bg-broker-surface-hover text-broker-text hover:text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors text-left">
          <span className="flex items-center gap-2">Route Calculator <WrenchIcon filled size="w-3 h-3" /></span>
          <span className="block text-xs text-broker-text-muted mt-0.5">Build routes, calculate revenue per corp</span>
        </button>
        <button onClick={() => navigate('/endgame')}
          className="w-full bg-broker-surface hover:bg-broker-surface-hover text-broker-text hover:text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors text-left">
          <span className="flex items-center gap-2">Endgame Calculator <WrenchIcon filled size="w-3 h-3" /></span>
          <span className="block text-xs text-broker-text-muted mt-0.5">Enter shares and prices — crank ORs to bank break</span>
        </button>
      </div>

      {/* ===== SAVED GAMES ===== */}
      {savedList.length > 0 && (
        <div className="w-full max-w-md mb-6">
          <SectionLabel>Continue</SectionLabel>
          <div className="space-y-2">
            {savedList.map(({ key, game }) => {
              const date = game.createdAt ? new Date(game.createdAt).toLocaleDateString() : '—'
              const players = game.players?.map((p) => p.name).join(', ') || '—'
              const actions = game.actionLog?.length || 0
              return (
                <div key={key} className="bg-broker-surface border border-broker-border rounded-lg p-3 flex items-center justify-between">
                  <button onClick={() => handleLoad(key, game)} className="flex-1 text-left hover:text-broker-gold transition-colors">
                    <div className="font-medium">
                      {game.title?.title || key}
                      <span className="text-broker-text-muted text-sm ml-2">{date}</span>
                    </div>
                    <div className="text-xs text-broker-text-muted">{players} · {actions} actions</div>
                  </button>
                  <button onClick={() => handleDelete(key)} className="text-broker-gold-dim hover:text-red-400 ml-3 px-2 py-1 text-sm">×</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===== NEW GAME ===== */}
      <div className="w-full max-w-md mb-2 flex items-center justify-between">
        <SectionLabel>New Game ({sorted.length})</SectionLabel>
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
            onShowLegend={() => setShowLegend(true)} onShowInfo={setShowInfo} />
        ))}
      </div>
      {sorted.length === 0 && (
        <div className="text-xs text-broker-text-muted w-full max-w-md text-center py-4">
          No titles at this rating. <button onClick={() => setMinRating(0)} className="underline">Show all</button>
        </div>
      )}

      {/* ===== IMPORT ===== */}
      <div className="w-full max-w-md mt-6">
        <SectionLabel>Import</SectionLabel>
        <div className="bg-broker-surface border border-broker-border rounded-lg p-3">
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

        <button onClick={() => fileRef.current?.click()}
          className="w-full mt-2 bg-broker-surface hover:bg-broker-surface-hover border border-dashed border-broker-border rounded-lg py-2 text-xs text-broker-text-muted hover:text-white transition-colors">
          Load from file
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </div>

      {/* ===== JOIN ROOM ===== */}
      <div className="w-full max-w-md mt-6">
        <RoomJoin sync={sync} />
      </div>

      {/* About / Legal */}
      <div className="w-full max-w-md mt-8 mb-4 text-center">
        <button onClick={() => navigate('/about')}
          className="text-xs text-broker-text-muted hover:text-broker-gold">
          About / Legal / Impressum
        </button>
      </div>

      {showLegend && <WrenchLegend onClose={() => setShowLegend(false)} />}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowInfo(null)}>
          <div className="bg-broker-bg border border-broker-border rounded-lg p-4 shadow-xl w-80 max-w-[90vw]"
            onClick={e => e.stopPropagation()}>
            <div className="text-sm text-white font-bold mb-1">{showInfo.title}</div>
            <div className="text-xs text-broker-text-muted mb-3">{showInfo.subtitle}</div>
            <div className="text-xs text-broker-text space-y-1">
              {(showInfo.gameInfo || '').split('•').filter(s => s.trim()).map((line, i) => (
                <div key={i} className="flex gap-1">
                  <span className="text-broker-text-muted">•</span>
                  <span>{line.trim()}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-broker-text-muted mt-3">
              {showInfo.minPlayers}–{showInfo.maxPlayers} players • {showInfo.designer}
            </div>
            <button onClick={() => setShowInfo(null)}
              className="mt-3 w-full text-xs text-broker-text-muted hover:text-white py-2 px-3">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

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

function WrenchIcon({ filled, size = 'w-3 h-3' }) {
  return (
    <svg className={`${size} ${filled ? 'text-broker-gold' : 'text-broker-text-muted/20'}`}
      viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  )
}

function WrenchRating({ level, onShowLegend }) {
  return (
    <span onClick={e => { e.stopPropagation(); onShowLegend?.() }}
      className="flex gap-px items-center cursor-pointer" title={WRENCH_LABELS[level] || ''}>
      {Array.from({ length: 5 }, (_, i) => <WrenchIcon key={i} filled={i < level} />)}
    </span>
  )
}

function WrenchLegend({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-broker-bg border border-broker-border rounded-lg p-4 shadow-xl w-72 max-w-[90vw]"
        onClick={e => e.stopPropagation()}>
        <div className="text-sm text-white font-bold mb-3">Wrench Rating</div>
        <div className="space-y-2">
          {WRENCH_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-4 text-right text-xs text-broker-text-muted">{i}</span>
              <span className="flex gap-px">
                {Array.from({ length: 5 }, (_, j) => <WrenchIcon key={j} filled={j < i} size="w-2.5 h-2.5" />)}
              </span>
              <span className="text-xs text-broker-text">{label}</span>
            </div>
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
        <WrenchRating level={m} onShowLegend={onShowLegend} />
      </div>
    </button>
  )
}

function RoomJoin({ sync }) {
  const [code, setCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)

  if (!sync) return null

  if (sync.roomId) {
    return (
      <div className="bg-broker-surface rounded-lg px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${sync.status === 'connected' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
          <span className="text-broker-text-muted">Room</span>
          <span className="font-mono font-bold text-white tracking-wider">{sync.roomId}</span>
          <span className="text-broker-text-muted">{sync.peerCount > 0 ? `${sync.peerCount + 1} devices` : 'waiting...'}</span>
        </div>
        <button onClick={sync.leaveRoom} className="text-broker-text-muted hover:text-red-300">Leave</button>
      </div>
    )
  }

  return (
    <div className="flex gap-2 justify-center text-xs">
      {showJoin ? (
        <>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Room code" maxLength={6} autoFocus
            className="w-24 bg-broker-surface border border-broker-border rounded px-2 py-1 text-white font-mono tracking-wider placeholder-broker-text-muted text-center" />
          <button onClick={() => { if (code.trim().length >= 4) { sync.joinRoom(code); setShowJoin(false) } }}
            disabled={code.trim().length < 4}
            className="bg-blue-800 hover:bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-40">Join</button>
          <button onClick={() => setShowJoin(false)} className="text-broker-text-muted hover:text-white px-2">Cancel</button>
        </>
      ) : (
        <button onClick={() => setShowJoin(true)}
          className="text-broker-text-muted hover:text-white">
          Join Room
        </button>
      )}
    </div>
  )
}

const SUPPORTED_TITLES = new Set([
  '1817','1822','1822CA','1822MX','1830','1846','1847 AE','1849','1858','1860',
  '1861','1862','1867','1871','1880','1889',
  '18Chesapeake','18GB','18India','18Ireland','18MEX','18MS','18RHL','18 Royal Gorge','18SJ','18USA',
  '21Moon','22Mars',
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
