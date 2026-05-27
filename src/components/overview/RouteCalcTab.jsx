// RouteCalcTab — per-corp route/revenue calculator.
// Simple: add stops as value buttons, build route per train by clicking stops.
// No restrictions — player decides what's valid.

import { useState, useEffect, useMemo } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { formatCurrency } from '../../utils/currency.js'

export default function RouteCalcTab() {
  const game = useGameStore((s) => s.game)
  const skin = useUIStore((s) => s.skin)
  const m = skin === 'moderator'
  const fmt = (n) => formatCurrency(n, game?.title?.currencyFormat || '$')

  return (
    <div className={m
      ? 'font-mono text-xs p-2 space-y-3 overflow-y-auto bg-blue-950 text-blue-300 h-full'
      : 'text-sm p-3 space-y-4 overflow-y-auto bg-broker-bg h-full'
    }>
      <h2 className={m ? 'text-green-400 font-bold' : 'text-white font-bold text-lg'}>
        Route Calculator
      </h2>
      <RouteCalc game={game} fmt={fmt} m={m} />
    </div>
  )
}

function RouteCalc({ game, fmt, m }) {
  const activeSym = useUIStore.getState().activeCorpSym
  const savedRoutes = useUIStore((s) => s.savedRoutes)
  const saveRoutes = useUIStore((s) => s.saveRoutes)

  const initState = () => {
    const sym = activeSym
    const saved = sym && savedRoutes[sym]
    if (saved) return saved

    if (game && sym) {
      const c = game.corporations.find(x => x.sym === sym && x.floated)
      if (c && c.trains.length > 0) {
        return {
          corp: { sym: c.sym, color: c.color },
          trains: c.trains.map(t => ({ id: `${c.sym}-${t.id}`, name: t.name, route: [] })),
          stops: [],
        }
      }
    }
    return { corp: { sym: '', color: '#888' }, trains: [{ id: '1', name: '2', route: [] }], stops: [] }
  }

  const init = useMemo(initState, [activeSym])
  const [corp, setCorp] = useState(init.corp)
  const [trains, setTrains] = useState(init.trains)
  const [stops, setStops] = useState(init.stops) // [number]
  const [activeTrain, setActiveTrain] = useState(null)

  useEffect(() => {
    const s = initState()
    setCorp(s.corp); setTrains(s.trains); setStops(s.stops); setActiveTrain(null)
  }, [activeSym])

  useEffect(() => {
    if (corp.sym && stops.length > 0) saveRoutes(corp.sym, { corp, trains, stops })
  }, [corp.sym, trains, stops])

  // --- Stops: just values ---
  const addStop = (v) => { if (v > 0) setStops(prev => [...prev, v]) }
  const removeStop = (idx) => {
    setStops(prev => prev.filter((_, i) => i !== idx))
    setTrains(prev => prev.map(t => ({ ...t, route: t.route.filter(si => si !== idx).map(si => si > idx ? si - 1 : si) })))
  }

  // --- Trains ---
  const addTrain = () => setTrains(prev => [...prev, { id: String(Date.now()), name: String(prev.length + 1), route: [] }])
  const removeTrain = (idx) => {
    if (trains[idx]?.id === activeTrain) setActiveTrain(null)
    setTrains(prev => prev.filter((_, i) => i !== idx))
  }

  // --- Route building: click stop to add/remove from active train ---
  const takenBy = {}
  for (const t of trains) for (const si of t.route) takenBy[si] = t.id

  const toggleStop = (idx) => {
    if (!activeTrain) return
    setTrains(prev => prev.map(t => {
      if (t.id !== activeTrain) return t
      return t.route.includes(idx)
        ? { ...t, route: t.route.filter(si => si !== idx) }
        : { ...t, route: [...t.route, idx] }
    }))
  }

  // --- Revenue ---
  const trainRev = (t) => t.route.reduce((s, si) => s + (stops[si] || 0), 0)
  const total = trains.reduce((s, t) => s + trainRev(t), 0)

  // --- Styles ---
  const labelCls = m ? 'text-blue-400 text-[10px]' : 'text-broker-text-muted text-[10px]'
  const btnSmall = m
    ? 'text-[10px] bg-green-900/50 text-green-300 hover:bg-green-800 px-2 py-0.5 rounded'
    : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white px-2 py-0.5 rounded'
  const nameInput = m
    ? 'w-10 bg-black/30 border border-blue-800 rounded px-1 py-0.5 text-xs text-blue-300 focus:outline-none'
    : 'w-10 bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-white focus:outline-none'

  return (
    <>
      {/* Total — always at top */}
      <div className={m
        ? 'bg-green-900/30 border border-green-800 rounded p-2 flex items-center gap-3 flex-wrap'
        : 'bg-broker-surface border border-broker-border rounded-lg p-3 flex items-center gap-3 flex-wrap'
      }>
        <span className={`text-2xl font-bold ${m ? 'text-white' : 'text-white'}`}>{fmt(total)}</span>
        <span className={labelCls}>{fmt(Math.floor(total / 10))}/share</span>
        {trains.filter(t => t.route.length > 0).map(t => (
          <span key={t.id} className="text-xs">{t.name}: {fmt(trainRev(t))}</span>
        ))}
        {total > 0 && game && corp.sym && (
          <button onClick={() => {
            useUIStore.getState().setRouteRevenue(corp.sym, total)
            useUIStore.getState().setActiveCorp(corp.sym)
            useUIStore.getState().setActiveTab('corps')
          }} className={m
            ? 'ml-auto text-xs bg-green-800 text-green-200 hover:bg-green-700 px-3 py-1.5 rounded font-bold'
            : 'ml-auto text-xs bg-green-700 text-white hover:bg-green-600 px-3 py-1.5 rounded font-bold'
          }>→ {corp.sym} Pay/Withhold</button>
        )}
      </div>

      {/* Corp selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {game && game.corporations.filter(c => c.floated).map(c => (
          <button key={c.sym}
            onClick={() => useUIStore.getState().setActiveCorp(c.sym)}
            className={`text-xs px-2 py-1 rounded font-medium ${corp.sym === c.sym ? 'ring-2 ring-white' : savedRoutes[c.sym] ? 'opacity-80' : 'opacity-50'}`}
            style={{ backgroundColor: c.color, color: c.textColor || '#fff' }}>
            {c.sym}{savedRoutes[c.sym] && corp.sym !== c.sym ? '*' : ''}
          </button>
        ))}
        <input type="text" value={corp.sym}
          onChange={e => setCorp({ sym: e.target.value.toUpperCase(), color: '#888' })}
          placeholder="CORP" className={`${nameInput} w-12 font-bold`} />
      </div>

      {/* Stops — add by clicking values */}
      <Panel m={m} title="Stops">
        <div className="flex flex-wrap gap-1 mb-2">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => (
            <button key={v} onClick={() => addStop(v)}
              className={m
                ? 'text-xs bg-blue-900/50 text-blue-300 hover:bg-blue-800 px-2 py-1 rounded min-w-[2rem]'
                : 'text-xs bg-broker-surface-hover text-broker-text hover:text-white px-2 py-1 rounded min-w-[2rem]'
              }>{v}</button>
          ))}
        </div>

        {stops.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {stops.map((v, i) => {
              const owner = takenBy[i]
              const ownerTrain = owner ? trains.find(t => t.id === owner) : null
              const inActive = activeTrain && trains.find(t => t.id === activeTrain)?.route.includes(i)
              const takenByOther = owner && owner !== activeTrain

              return (
                <button key={i}
                  onClick={() => activeTrain ? toggleStop(i) : removeStop(i)}
                  className={`text-xs px-2 py-1 rounded font-bold transition-colors ${
                    inActive
                      ? (m ? 'bg-green-800 text-green-200 ring-1 ring-green-500' : 'bg-blue-600 text-white ring-1 ring-blue-400')
                      : takenByOther
                        ? (m ? 'bg-blue-900/20 text-blue-700' : 'bg-broker-bg text-broker-text-muted/30')
                        : (m ? 'bg-blue-900/40 text-blue-300' : 'bg-broker-surface-hover text-broker-text')
                  }`}
                  title={activeTrain ? 'Click to add/remove from route' : 'Click to delete stop'}>
                  {v}
                  {ownerTrain && !inActive && <span className="text-[9px] opacity-40 ml-0.5">{ownerTrain.name}</span>}
                </button>
              )
            })}
          </div>
        )}
      </Panel>

      {/* Trains — one row each */}
      <Panel m={m} title="Trains">
        <div className="space-y-2">
          {trains.map((t, i) => {
            const rev = trainRev(t)
            const isActive = activeTrain === t.id
            return (
              <div key={t.id} className={`rounded p-2 ${isActive
                ? (m ? 'bg-green-900/30 border border-green-700' : 'bg-blue-900/20 border border-blue-600')
                : (m ? 'bg-blue-900/20' : 'bg-broker-bg')
              }`}>
                <div className="flex items-center gap-2">
                  <input type="text" value={t.name}
                    onChange={e => setTrains(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    className={`${nameInput} font-bold`} />
                  <button onClick={() => setActiveTrain(isActive ? null : t.id)}
                    className={`text-[10px] px-2 py-0.5 rounded font-medium ${isActive
                      ? (m ? 'bg-green-700 text-white' : 'bg-blue-600 text-white')
                      : (m ? 'bg-blue-800 text-blue-300' : 'bg-broker-surface-hover text-broker-text')
                    }`}>
                    {isActive ? 'done' : 'route'}
                  </button>
                  {t.route.length > 0 && (
                    <button onClick={() => setTrains(prev => prev.map(x => x.id === t.id ? { ...x, route: [] } : x))}
                      className="text-[10px] text-red-400 px-1">clear</button>
                  )}
                  <span className={`ml-auto font-bold ${m ? 'text-white' : 'text-white'}`}>
                    {rev > 0 ? fmt(rev) : '—'}
                  </span>
                  <button onClick={() => removeTrain(i)} className="text-[10px] text-red-400 px-1">×</button>
                </div>
                {t.route.length > 0 && (
                  <div className={`mt-1 text-[10px] ${m ? 'text-blue-400' : 'text-broker-text-muted'}`}>
                    {t.route.map((si, ri) => <span key={ri}>{ri > 0 && ' → '}<span className="font-bold">{stops[si]}</span></span>)}
                  </div>
                )}
                {isActive && t.route.length === 0 && stops.length > 0 && (
                  <div className={`mt-1 text-[10px] ${m ? 'text-green-400' : 'text-blue-400'}`}>Click stops above</div>
                )}
              </div>
            )
          })}
          <button onClick={addTrain} className={btnSmall}>+ Train</button>
        </div>
      </Panel>
    </>
  )
}

function Panel({ m, title, children }) {
  return (
    <div className={m
      ? 'bg-blue-900/30 border border-blue-800 rounded p-2'
      : 'bg-broker-surface rounded-lg p-3 border border-broker-border'
    }>
      {title && <div className={m ? 'text-green-400 font-bold mb-1' : 'text-white font-medium mb-2'}>{title}</div>}
      {children}
    </div>
  )
}
