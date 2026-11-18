import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { allTitles } from '../../titles/index.js'
import { useGameStore } from '../../store/gameStore.js'
import { useRoleStore } from '../../store/roleStore.js'
import { useSyncContext } from '../../hooks/SyncContext.jsx'
import { loadAllGames, deleteGame, importGame, exportGame } from '../../utils/persistence.js'
import { useThemeStore, themes } from '../../store/themeStore.js'
import { IconBack, IconClose } from '../shared/Icons.jsx'

export default function GameSelector() {
  const navigate = useNavigate()
  const loadGame = useGameStore((s) => s.loadGame)
  const importFrom18xxGames = useGameStore((s) => s.importFrom18xxGames)
  const sync = useSyncContext()
  const titles = allTitles()
  const [savedGames, setSavedGames] = useState(() => loadAllGames())
  const game = useGameStore((s) => s.game)
  const [view, setView] = useState('hub')
  const [soloMode, setSoloMode] = useState(false)
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

  // ===== HUB VIEW — 3-step wizard =====
  if (view === 'hub') {
    const step2Done = !!game
    const step1Done = !!sync?.roomId || soloMode || step2Done

    return (
      <div className="min-h-screen flex flex-col items-center p-6 bg-broker-bg">
        {/* Brand header */}
        <div className="flex items-center gap-3 mt-2 mb-1">
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt="" className="w-10 h-10 rounded-lg" />
          <h1 className="text-2xl font-bold text-white tracking-wide">Laytrack</h1>
        </div>
        <p className="text-sm text-broker-accent italic mb-1">Lay track. I do the numbers.</p>
        <p className="text-[10px] text-broker-text-muted/50 mb-5">
          v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'} · {typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : '?'}
        </p>

        {/* Quick continue */}
        {savedList.length > 0 && !game && (
          <div className="w-full max-w-md mb-4">
            <button onClick={() => handleLoad(savedList[0].key, savedList[0].game)}
              className="w-full bg-broker-surface hover:bg-broker-surface-hover border border-broker-gold/40 rounded-xl p-3 text-left transition-colors group">
              <div className="text-[10px] text-broker-gold uppercase tracking-wider mb-0.5 group-hover:text-broker-gold">Continue last game</div>
              <div className="font-medium text-white">{savedList[0].game.title?.title || savedList[0].key}</div>
              <div className="text-xs text-broker-text-muted">{savedList[0].game.players?.map(p => p.name).join(', ')}</div>
            </button>
          </div>
        )}

        <div className="w-full max-w-md space-y-3">

          {/* ===== STEP 1: Connection ===== */}
          <StepCard active={!step1Done} done={step1Done} num={1} label="How are you playing?">
            {sync?.roomId ? (
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sync.status === 'connected' ? 'bg-broker-accent' : 'bg-broker-gold animate-pulse'}`} />
                <span className="font-mono font-bold text-white tracking-wider">{sync.roomId}</span>
                <span className="text-xs text-broker-text-muted">{sync.peerCount > 0 ? `${sync.peerCount + 1} devices` : 'waiting'}</span>
                <button onClick={() => { sync.leaveRoom(); setSoloMode(false) }} className="text-xs text-red-400 hover:text-red-300 ml-auto">Leave</button>
              </div>
            ) : soloMode ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-broker-accent font-medium">Solo mode</span>
                <button onClick={() => setSoloMode(false)} className="text-xs text-broker-text-muted hover:text-white">Change</button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <HubButton onClick={() => setSoloMode(true)} icon={<SoloIcon />} label="Solo" />
                <HubButton onClick={() => sync?.createRoom()} icon={<CreateIcon />} label="Create Room" />
                <HubButton onClick={() => setView('join')} icon={<JoinIcon />} label="Join Room" />
              </div>
            )}
          </StepCard>

          {/* ===== STEP 2: Game ===== */}
          <StepCard active={step1Done && !step2Done} done={step2Done} disabled={!step1Done} num={2} label="Which game?"
            detail={step2Done && <span className="text-xs text-broker-accent ml-auto">{game.title.title}</span>}>
            {step2Done ? (
              <div className="text-xs text-broker-text-muted">
                {game.players.map(p => p.name).join(', ')} · {game.actionLog?.length || 0} actions
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <HubButton onClick={() => setView('titles')} icon={<NewGameIcon />} label="New Game" sub="Pick a title" />
                <HubButton onClick={() => setView('depot')} icon={<DepotIcon />} label="Load Game" sub="Depot & import" />
              </div>
            )}
          </StepCard>

          {/* ===== STEP 3: Role ===== */}
          <RolePicker step2Done={step2Done} game={game} />

        </div>

        {/* Footer */}
        <div className="flex gap-4 mt-6">
          <button onClick={() => setView('settings')} className="text-xs text-broker-text-muted hover:text-broker-gold transition-colors">Settings</button>
          <button onClick={() => navigate('/about')} className="text-xs text-broker-text-muted hover:text-broker-gold transition-colors">About / Legal</button>
        </div>
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

  // ===== SETTINGS VIEW =====
  if (view === 'settings') {
    return <SettingsView navigate={navigate} onBack={() => setView('hub')} />
  }

  return null
}

// ===== STEP CARD WRAPPER =====
function StepCard({ active, done, disabled, num, label, detail, children }) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${
      active ? 'border-broker-gold bg-broker-surface' :
      disabled ? 'border-broker-border/50 bg-broker-surface/30 opacity-50' :
      done ? 'border-broker-accent/30 bg-broker-surface/70' :
      'border-broker-border bg-broker-surface/50'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          done ? 'bg-broker-accent text-broker-bg' :
          active ? 'bg-broker-gold text-broker-bg' :
          'bg-broker-surface-hover text-broker-text-muted'
        }`}>{done ? '✓' : num}</span>
        <span className="text-sm font-bold text-white">{label}</span>
        {detail}
      </div>
      {children}
    </div>
  )
}

// ===== HUB BUTTON (icon + label, replaces scene images) =====
function HubButton({ onClick, icon, label, sub }) {
  return (
    <button onClick={onClick}
      className="bg-broker-surface-hover hover:bg-broker-gold/15 border border-broker-border hover:border-broker-gold/40 rounded-lg p-3 text-center transition-all group">
      <div className="w-10 h-10 mx-auto mb-1.5 flex items-center justify-center text-broker-text-muted group-hover:text-broker-gold transition-colors">
        {icon}
      </div>
      <div className="text-xs font-bold text-white">{label}</div>
      {sub && <div className="text-[10px] text-broker-text-muted">{sub}</div>}
    </button>
  )
}

// ===== INLINE SVG ICONS =====
function SoloIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
    </svg>
  )
}

function CreateIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function JoinIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  )
}

function NewGameIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

function DepotIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

// ===== JOIN VIEW =====
function JoinView({ sync, onBack }) {
  const [code, setCode] = useState('')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-broker-bg">
      <div className="w-12 h-12 mb-4 flex items-center justify-center text-broker-gold">
        <JoinIcon />
      </div>
      <h2 className="text-xl font-bold text-white mb-1">Join Room</h2>
      <p className="text-xs text-broker-text-muted mb-4">Enter the room code from your host</p>
      <div className="flex gap-2 items-center">
        <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CODE" maxLength={6} autoFocus
          onKeyDown={e => e.key === 'Enter' && code.trim().length >= 4 && sync?.joinRoom(code)}
          className="w-32 bg-broker-surface border border-broker-border rounded-lg px-3 py-3 text-white font-mono text-xl tracking-widest placeholder-broker-text-muted text-center focus:outline-none focus:border-broker-gold transition-colors" />
        <button onClick={() => { if (code.trim().length >= 4) sync?.joinRoom(code) }}
          disabled={code.trim().length < 4}
          className="bg-broker-gold hover:bg-broker-gold-dim text-broker-bg px-5 py-3 rounded-lg font-bold disabled:opacity-40 transition-colors">
          Board
        </button>
      </div>
      <button onClick={onBack} className="mt-6 text-xs text-broker-text-muted hover:text-white"><IconBack className="w-3 h-3 inline" /> Back</button>
    </div>
  )
}

// ===== CREATE VIEW =====
function CreateView({ sync, titles, navigate, onBack, showLegend, setShowLegend, showInfo, setShowInfo }) {
  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-broker-bg">
      <div className="w-12 h-12 mb-3 flex items-center justify-center text-broker-gold">
        <CreateIcon />
      </div>
      <h2 className="text-xl font-bold text-white mb-1">Create Room</h2>
      {sync?.roomId ? (
        <div className="flex items-center gap-3 mb-4">
          <span className={`w-3 h-3 rounded-full ${sync.status === 'connected' ? 'bg-broker-accent' : 'bg-broker-gold animate-pulse'}`} />
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
      <button onClick={onBack} className="mt-6 text-xs text-broker-text-muted hover:text-white"><IconBack className="w-3 h-3 inline" /> Back (room stays active)</button>
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
              className={`text-xs px-2 py-1 rounded transition-colors ${sortBy === id
                ? 'bg-broker-gold text-broker-bg font-medium'
                : 'text-broker-text-muted hover:text-white'
              }`}>{label}</button>
          ))}
          <span className="text-broker-text-muted/30 mx-0.5">|</span>
          {[0, 1, 2, 3, 4].map(r => (
            <button key={r} onClick={() => setMinRating(minRating === r ? 0 : r)}
              className={`text-xs px-2 py-1 rounded transition-colors ${minRating === r
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
    <div className="min-h-screen flex flex-col items-center p-6 bg-broker-bg">
      <div className="w-full max-w-md mb-3 flex items-center gap-3">
        <button onClick={onBack} className="text-broker-text-muted hover:text-white"><IconBack className="w-4 h-4" /></button>
        <div className="w-8 h-8 flex items-center justify-center text-broker-gold">
          <NewGameIcon />
        </div>
        <h2 className="text-lg font-bold text-white">New Game</h2>
      </div>
      <TitlesGrid titles={titles} navigate={navigate} showLegend={showLegend} setShowLegend={setShowLegend} showInfo={showInfo} setShowInfo={setShowInfo} />
      <button onClick={onBack} className="mt-6 text-xs text-broker-text-muted hover:text-white"><IconBack className="w-3 h-3 inline" /> Back</button>
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
    <div className="min-h-screen flex flex-col items-center p-6 bg-broker-bg">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-broker-text-muted hover:text-white"><IconBack className="w-4 h-4" /></button>
          <div className="w-8 h-8 flex items-center justify-center text-broker-gold">
            <DepotIcon />
          </div>
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
                    className="text-broker-text-muted hover:text-red-400 px-2 py-1 min-h-[44px] min-w-[44px] flex items-center justify-center" title="Delete"><IconClose className="w-4 h-4" /></button>
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
              className="flex-1 bg-broker-bg border border-broker-border rounded px-3 py-2 text-sm text-white placeholder-broker-text-muted font-mono focus:outline-none focus:border-broker-gold transition-colors" />
            <button
              onClick={async () => {
                if (!importId || importing) return
                setImporting(true); setImportError(null)
                try { await importFrom18xxGames(parseInt(importId, 10)); navigate('/') }
                catch (err) { setImportError(err.message) }
                finally { setImporting(false) }
              }}
              disabled={!importId || importing}
              className="bg-broker-green hover:bg-broker-green-light text-white px-4 py-2 rounded text-sm disabled:opacity-40 transition-colors">
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

        <button onClick={onBack} className="mt-4 text-xs text-broker-text-muted hover:text-white w-full text-center"><IconBack className="w-3 h-3 inline" /> Back</button>
      </div>
    </div>
  )
}

// ===== SETTINGS VIEW =====
function SettingsView({ navigate, onBack }) {
  const themeId = useThemeStore((s) => s.themeId)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div className="min-h-screen flex flex-col items-center p-6 bg-broker-bg">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="text-broker-text-muted hover:text-white"><IconBack className="w-4 h-4" /></button>
          <div className="w-8 h-8 flex items-center justify-center text-broker-gold">
            <SettingsIcon />
          </div>
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
            className="text-xs text-broker-text-muted hover:text-broker-gold transition-colors">
            About / Legal / Impressum
          </button>
        </div>

        <button onClick={onBack} className="mt-4 text-xs text-broker-text-muted hover:text-white w-full text-center"><IconBack className="w-3 h-3 inline" /> Back</button>
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
              <span className="text-broker-accent">✓</span>
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
      className="bg-broker-surface hover:bg-broker-surface-hover border border-broker-border hover:border-broker-gold/40 rounded-lg p-4 text-left transition-all relative overflow-hidden">
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

// ===== ROLE PICKER =====
const ROLES = [
  { id: 'umpire',   label: 'Umpire',   desc: 'Full control. Desktop/laptop.',    icon: 'U' },
  { id: 'player',   label: 'Player',   desc: 'Your holdings & actions. Phone.',  icon: 'P' },
  { id: 'kibitzer', label: 'Kibitzer', desc: 'Watch the game. Phone.',           icon: 'K' },
  { id: 'display',  label: 'Display',  desc: 'Auto-rotating dashboard. TV.',     icon: 'D' },
]

function RolePicker({ step2Done, game }) {
  const [pendingRole, setPendingRole] = useState(null)

  function pickRole(roleId) {
    if (roleId === 'player') {
      setPendingRole('player')
    } else {
      useRoleStore.getState().setRole(roleId)
    }
  }

  function confirmPlayer(playerId) {
    const store = useRoleStore.getState()
    store.setRole('player')
    store.setPlayerId(playerId)
  }

  return (
    <StepCard active={step2Done} disabled={!step2Done} num={3} label="Your role">
      {pendingRole === 'player' && game ? (
        <div className="space-y-2">
          <div className="text-xs text-broker-text-muted mb-1">Which player are you?</div>
          {game.players.map(p => (
            <button key={p.id} onClick={() => confirmPlayer(p.id)}
              className="w-full bg-broker-surface-hover hover:bg-broker-gold/15 border border-broker-border hover:border-broker-gold/40 rounded-lg p-3 text-left transition-all">
              <span className="text-sm font-bold text-white">{p.name}</span>
            </button>
          ))}
          <button onClick={() => setPendingRole(null)}
            className="text-xs text-broker-text-muted hover:text-white mt-1"><IconBack className="w-3 h-3 inline" /> Back</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map(r => (
            <button key={r.id} onClick={() => pickRole(r.id)}
              disabled={!step2Done}
              className="bg-broker-surface-hover hover:bg-broker-gold/15 border border-broker-border hover:border-broker-gold/40 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg p-3 text-center transition-all group">
              <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-broker-border/50 group-hover:bg-broker-gold/20 flex items-center justify-center text-xs font-bold text-broker-text-muted group-hover:text-broker-gold transition-colors">{r.icon}</div>
              <div className="text-xs font-bold text-white">{r.label}</div>
              <div className="text-[10px] text-broker-text-muted">{r.desc}</div>
            </button>
          ))}
        </div>
      )}
    </StepCard>
  )
}

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
          className={`text-xs px-2 py-0.5 rounded transition-colors ${tab === 'active' && games ? 'bg-broker-green text-white' : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'}`}>
          Active
        </button>
        <button onClick={() => fetchGames('finished', titleFilter)}
          className={`text-xs px-2 py-0.5 rounded transition-colors ${tab === 'finished' && games ? 'bg-broker-green text-white' : 'bg-broker-surface-hover text-broker-text-muted hover:text-white'}`}>
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
                className="text-xs bg-broker-green hover:bg-broker-green-light text-white px-2 py-0.5 rounded ml-2 disabled:opacity-40 flex-shrink-0 transition-colors">
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
