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

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      {/* Theme switcher */}
      <div className="self-end flex gap-1 mb-2">
        {Object.values(themes).map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
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

      <img src={import.meta.env.BASE_URL + 'logo.png'} alt="18xxBroker" className="w-48 mb-4 mt-2" />

      {/* Room join — join a peer's game */}
      <RoomJoin sync={sync} />

      <p className="text-broker-text-muted mb-8">Choose a game</p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {titles.map((t) => (
          <button
            key={t.titleId}
            onClick={() => { console.log('[GameSelector] selected:', t.titleId, t.title); navigate(`/setup/${t.titleId}`) }}
            className="bg-broker-surface hover:bg-broker-surface-hover border border-broker-border rounded-lg p-4 text-left transition-colors relative overflow-hidden"
          >
            {t.wip && (
              <svg className="absolute -bottom-2 -right-2 w-20 h-20 opacity-[0.07] text-broker-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            )}
            <div className="text-xl font-bold text-broker-text">{t.title}</div>
            <div className="text-sm text-broker-text-muted mt-1">{t.subtitle}</div>
            <div className="text-xs text-broker-text-muted mt-2">
              {t.minPlayers}–{t.maxPlayers} players
            </div>
          </button>
        ))}
      </div>

      {/* Import from 18xx.games */}
      <div className="w-full max-w-md mt-6">
        <div className="bg-broker-surface border border-broker-border rounded-lg p-3">
          <div className="text-xs text-broker-text-muted mb-2 font-medium uppercase">Import from 18xx.games</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={importId}
              onChange={(e) => { setImportId(e.target.value.replace(/\D/g, '')); setImportError(null) }}
              placeholder="Game ID"
              className="flex-1 bg-broker-bg border border-broker-border rounded px-3 py-2 text-sm text-white placeholder-broker-text-muted font-mono"
            />
            <button
              onClick={async () => {
                if (!importId || importing) return
                setImporting(true)
                setImportError(null)
                try {
                  await importFrom18xxGames(parseInt(importId, 10))
                  navigate('/')
                } catch (err) {
                  setImportError(err.message)
                } finally {
                  setImporting(false)
                }
              }}
              disabled={!importId || importing}
              className="bg-purple-800 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm disabled:opacity-40"
            >
              {importing ? 'Loading...' : 'Import'}
            </button>
          </div>
          {importError && (
            <div className="text-xs text-red-400 mt-2">{importError}</div>
          )}

          {/* Live games browser */}
          <LiveGames onSelect={(id) => { setImportId(String(id)) }} importing={importing}
            onImport={async (id) => {
              setImporting(true); setImportError(null)
              try { await importFrom18xxGames(id); navigate('/') }
              catch (err) { setImportError(err.message) }
              finally { setImporting(false) }
            }} />
        </div>
      </div>

      {/* Load from file */}
      <div className="w-full max-w-md mt-6">
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full bg-broker-surface hover:bg-broker-surface-hover border border-dashed border-broker-border rounded-lg py-3 text-sm text-broker-text-muted hover:text-white transition-colors"
        >
          Load Game from File
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </div>

      {savedList.length > 0 && (
        <div className="w-full max-w-md mt-6">
          <h2 className="text-lg font-medium mb-3 text-broker-text">Saved Games</h2>
          <div className="space-y-2">
            {savedList.map(({ key, game }) => {
              const date = game.createdAt
                ? new Date(game.createdAt).toLocaleDateString()
                : '—'
              const players = game.players?.map((p) => p.name).join(', ') || '—'
              const actions = game.actionLog?.length || 0

              return (
                <div
                  key={key}
                  className="bg-broker-surface border border-broker-border rounded-lg p-3 flex items-center justify-between"
                >
                  <button
                    onClick={() => handleLoad(key, game)}
                    className="flex-1 text-left hover:text-broker-gold transition-colors"
                  >
                    <div className="font-medium">
                      {game.title?.title || key}
                      <span className="text-broker-text-muted text-sm ml-2">{date}</span>
                    </div>
                    <div className="text-xs text-broker-text-muted">
                      {players} · {actions} actions
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(key)}
                    className="text-broker-gold-dim hover:text-red-400 ml-3 px-2 py-1 text-sm"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* About / Legal */}
      <div className="w-full max-w-md mt-8 mb-4 text-center">
        <button onClick={() => navigate('/about')}
          className="text-xs text-broker-text-muted hover:text-broker-gold">
          About / Legal / Impressum
        </button>
      </div>
    </div>
  )
}

function RoomJoin({ sync }) {
  const [code, setCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)

  if (!sync) return null

  if (sync.roomId) {
    return (
      <div className="w-full max-w-md mb-4 bg-broker-surface rounded-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            sync.status === 'connected' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
          }`} />
          <span className="text-sm text-broker-text-muted">Room</span>
          <span className="font-mono font-bold text-white tracking-wider">{sync.roomId}</span>
          <span className="text-xs text-broker-text-muted">
            {sync.peerCount > 0 ? `${sync.peerCount + 1} devices` : 'waiting...'}
          </span>
        </div>
        <button onClick={sync.leaveRoom} className="text-xs text-broker-text-muted hover:text-red-300">
          Leave
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mb-4 flex gap-2 justify-center">
      {showJoin ? (
        <>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Room code"
            maxLength={6}
            className="w-28 bg-broker-surface border border-broker-border rounded px-3 py-2 text-sm text-white font-mono tracking-wider placeholder-broker-text-muted text-center"
            autoFocus
          />
          <button
            onClick={() => { if (code.trim().length >= 4) { sync.joinRoom(code); setShowJoin(false) } }}
            disabled={code.trim().length < 4}
            className="bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm disabled:opacity-40"
          >
            Join
          </button>
          <button
            onClick={() => setShowJoin(false)}
            className="text-broker-text-muted hover:text-white px-2 text-sm"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          onClick={() => setShowJoin(true)}
          className="bg-broker-surface hover:bg-broker-surface-hover border border-broker-border rounded px-4 py-2 text-sm text-broker-text-muted hover:text-white"
        >
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
    setLoading(true)
    setError(null)
    setTab(status)
    const url = title
      ? `/18xx-games-api/game?title=${encodeURIComponent(title)}&status=${status}&page=1`
      : `/18xx-games-api/game?status=${status}&page=1`
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
                <span className="text-broker-text-muted ml-1 truncate">
                  {g.players.map(p => p.name).join(', ')}
                </span>
              </div>
              <button onClick={() => onImport(g.id)} disabled={importing}
                className="text-xs bg-purple-800 hover:bg-purple-700 text-white px-2 py-0.5 rounded ml-2 disabled:opacity-40 flex-shrink-0">
                Load
              </button>
            </div>
          ))}
        </div>
      )}
      {games && games.length === 0 && (
        <div className="text-xs text-broker-text-muted">No supported games found</div>
      )}
    </div>
  )
}
