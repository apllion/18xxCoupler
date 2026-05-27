// RouteCalcTab — per-corp route/revenue calculator.
// Add stops with values (and optional multipliers/bonuses).
// Assign stops to trains. Each stop used by only one train.
// Supports: stop multipliers, train multipliers, route bonuses, min/max.

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

  // Init from saved routes if available, otherwise from game
  const initState = () => {
    const sym = activeSym
    const saved = sym && savedRoutes[sym]

    // Restore saved state for this corp
    if (saved) {
      return {
        corp: saved.corp || { sym, color: '#888', name: '' },
        trains: saved.trains || [],
        stops: saved.stops || [],
        routeBonus: saved.routeBonus || 0,
      }
    }

    // Init from game
    if (game && sym) {
      const c = game.corporations.find(x => x.sym === sym && x.floated)
      if (c && c.trains.length > 0) {
        return {
          corp: { sym: c.sym, color: c.color, name: c.name },
          trains: c.trains.map(t => ({
            id: `${c.sym}-${t.id}`,
            name: t.name,
            stops: t.distance || parseInt(t.name) || 2,
            multiplier: t.multiplier || 1,
            route: [],
            bonus: 0,
          })),
          stops: [],
          routeBonus: 0,
        }
      }
    }

    return {
      corp: { sym: '', color: '#888', name: '' },
      trains: [{ id: '1', name: '2', stops: 2, multiplier: 1, route: [], bonus: 0 }],
      stops: [],
      routeBonus: 0,
    }
  }

  const init = useMemo(initState, [activeSym])

  const [corp, setCorp] = useState(init.corp)
  const [trains, setTrains] = useState(init.trains)
  const [stops, setStops] = useState(init.stops)
  const [newStop, setNewStop] = useState('')
  const [activeTrain, setActiveTrain] = useState(null)
  const [routeBonus, setRouteBonus] = useState(init.routeBonus)

  // Reload when switching to a different corp
  useEffect(() => {
    const s = initState()
    setCorp(s.corp)
    setTrains(s.trains)
    setStops(s.stops)
    setRouteBonus(s.routeBonus)
    setActiveTrain(null)
  }, [activeSym])

  // Auto-save routes for this corp whenever they change
  useEffect(() => {
    if (corp.sym && stops.length > 0) {
      saveRoutes(corp.sym, { corp, trains, stops, routeBonus })
    }
  }, [corp.sym, trains, stops, routeBonus])

  // --- Stops ---
  const addStop = (val) => {
    const v = parseInt(val)
    if (!v || v <= 0) return
    setStops(prev => [...prev, { value: v, mult: 1, bonus: 0, name: '' }])
    setNewStop('')
  }
  const removeStop = (idx) => {
    setStops(prev => prev.filter((_, i) => i !== idx))
    setTrains(prev => prev.map(t => ({
      ...t, route: t.route.filter(si => si !== idx).map(si => si > idx ? si - 1 : si)
    })))
  }
  const setStopField = (idx, field, val) => {
    setStops(prev => prev.map((s, i) => i === idx
      ? { ...s, [field]: field === 'name' ? val : (parseInt(val) || (field === 'mult' ? 1 : 0)) }
      : s))
  }

  const quickValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

  // --- Trains ---
  const addTrain = () => {
    setTrains(prev => [...prev, {
      id: String(Date.now()), name: '2', stops: 2, multiplier: 1, route: [], bonus: 0,
    }])
  }
  const removeTrain = (idx) => {
    if (trains[idx]?.id === activeTrain) setActiveTrain(null)
    setTrains(prev => prev.filter((_, i) => i !== idx))
  }
  const setTrainField = (idx, field, val) => {
    setTrains(prev => prev.map((t, i) => i === idx
      ? { ...t, [field]: field === 'name' ? val : (parseInt(val) || 0) }
      : t))
  }
  const clearRoute = (trainId) => {
    setTrains(prev => prev.map(t => t.id === trainId ? { ...t, route: [] } : t))
  }

  // --- Routing ---
  const takenBy = {} // stopIdx → trainId
  for (const t of trains) {
    for (const si of t.route) takenBy[si] = t.id
  }

  const toggleStop = (stopIdx) => {
    if (!activeTrain) return
    setTrains(prev => prev.map(t => {
      if (t.id !== activeTrain) return t
      const has = t.route.includes(stopIdx)
      if (has) return { ...t, route: t.route.filter(si => si !== stopIdx) }
      if (t.route.length >= t.stops) return t
      if (takenBy[stopIdx] && takenBy[stopIdx] !== t.id) return t
      return { ...t, route: [...t.route, stopIdx] }
    }))
  }

  // --- Revenue ---
  const trainRevenue = (t) => {
    let base = 0
    for (const si of t.route) {
      const s = stops[si]
      if (!s) continue
      base += s.value * (s.mult || 1) + (s.bonus || 0)
    }
    return base * (t.multiplier || 1) + (t.bonus || 0)
  }
  const totalRevenue = trains.reduce((s, t) => s + trainRevenue(t), 0) + routeBonus

  // --- Styles ---
  const inputCls = m
    ? 'w-12 bg-black/30 border border-blue-800 rounded px-1 py-0.5 text-xs text-blue-300 text-right focus:outline-none focus:border-green-600'
    : 'w-12 bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-white text-right focus:outline-none focus:border-blue-500'
  const nameInputCls = m
    ? 'bg-black/30 border border-blue-800 rounded px-1 py-0.5 text-xs text-blue-400 focus:outline-none focus:border-green-600'
    : 'bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-broker-text-muted focus:outline-none focus:border-blue-500'
  const labelCls = m ? 'text-blue-400 text-[10px]' : 'text-broker-text-muted text-[10px]'
  const btnSmall = m
    ? 'text-[10px] bg-green-900/50 text-green-300 hover:bg-green-800 px-2 py-0.5 rounded'
    : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white px-2 py-0.5 rounded'

  return (
    <>
      {/* Total revenue — always visible at top */}
      <div className={m
        ? 'bg-green-900/30 border border-green-800 rounded p-2 flex items-center gap-3 flex-wrap'
        : 'bg-broker-surface border border-broker-border rounded-lg p-3 flex items-center gap-3 flex-wrap'
      }>
        <span className={`text-2xl font-bold ${m ? 'text-white' : 'text-white'}`}>{fmt(totalRevenue)}</span>
        <span className={labelCls}>{fmt(Math.floor(totalRevenue / 10))}/share</span>
        {trains.filter(t => t.route.length > 0).map(t => (
          <span key={t.id} className="text-xs">{t.name}: {fmt(trainRevenue(t))}</span>
        ))}
        {routeBonus > 0 && <span className={labelCls}>+{routeBonus} bonus</span>}
        {totalRevenue > 0 && game && corp.sym && (
          <button onClick={() => {
            useUIStore.getState().setRouteRevenue(corp.sym, totalRevenue)
            useUIStore.getState().setActiveCorp(corp.sym)
            useUIStore.getState().setActiveTab('corps')
          }} className={m
            ? 'ml-auto text-xs bg-green-800 text-green-200 hover:bg-green-700 px-3 py-1.5 rounded font-bold'
            : 'ml-auto text-xs bg-green-700 text-white hover:bg-green-600 px-3 py-1.5 rounded font-bold'
          }>→ {corp.sym} Pay/Withhold</button>
        )}
      </div>

      {/* Corp selector + manual entry */}
      <div className="flex items-center gap-2 flex-wrap">
        {game && game.corporations.filter(c => c.floated).map(c => {
          const isSel = corp.sym === c.sym
          const hasSaved = !!savedRoutes[c.sym]
          return (
            <button key={c.sym}
              onClick={() => useUIStore.getState().setActiveCorp(c.sym)}
              className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                isSel ? 'ring-2 ring-white' : hasSaved ? 'opacity-80' : 'opacity-50'
              }`}
              style={{ backgroundColor: c.color, color: c.textColor || '#fff' }}>
              {c.sym}{hasSaved && !isSel ? '*' : ''}
            </button>
          )
        })}
        <input type="text" value={corp.sym}
          onChange={e => setCorp(prev => ({ ...prev, sym: e.target.value.toUpperCase() }))}
          placeholder="CORP" className={`${nameInputCls} w-12 font-bold`} />
        <span className={labelCls}>Bonus:</span>
        <input type="number" value={routeBonus || ''} onChange={e => setRouteBonus(parseInt(e.target.value) || 0)}
          placeholder="0" className={`${inputCls} w-10`} title="Route bonus (e.g. east-west)" />
      </div>

      {/* Stops */}
      <Panel m={m} title="Stops">
        {/* Quick add row */}
        <div className="flex flex-wrap gap-1 mb-2">
          {quickValues.map(v => (
            <button key={v} onClick={() => addStop(v)}
              className={m
                ? 'text-xs bg-blue-900/50 text-blue-300 hover:bg-blue-800 px-2 py-1 rounded min-w-[2rem]'
                : 'text-xs bg-broker-surface-hover text-broker-text hover:text-white px-2 py-1 rounded min-w-[2rem]'
              }>{v}</button>
          ))}
          <input type="number" value={newStop} onChange={e => setNewStop(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStop(newStop)}
            placeholder="+" className={`${inputCls} w-10`} />
          <button onClick={() => addStop(newStop)} className={btnSmall}>+</button>
        </div>

        {/* Stop list */}
        {stops.length > 0 ? (
          <div className="space-y-1">
            {stops.map((s, i) => {
              const owner = takenBy[i]
              const ownerTrain = owner ? trains.find(t => t.id === owner) : null
              const inActive = activeTrain && trains.find(t => t.id === activeTrain)?.route.includes(i)
              const takenByOther = owner && owner !== activeTrain
              const effective = s.value * (s.mult || 1) + (s.bonus || 0)

              // Routing mode — compact clickable chips
              if (activeTrain) {
                return (
                  <span key={i} onClick={() => toggleStop(i)}
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs mr-1 mb-1 cursor-pointer transition-colors ${
                      inActive
                        ? (m ? 'bg-green-800 text-green-200 ring-1 ring-green-500' : 'bg-blue-600 text-white ring-1 ring-blue-400')
                        : takenByOther
                          ? (m ? 'bg-blue-900/20 text-blue-700' : 'bg-broker-bg text-broker-text-muted/30')
                          : (m ? 'bg-blue-900/40 text-blue-300' : 'bg-broker-surface-hover text-broker-text')
                    }`}>
                    <span className="font-bold">{effective}</span>
                    {s.name && <span className={m ? 'text-blue-500' : 'text-broker-text-muted'}>{s.name}</span>}
                    {ownerTrain && !inActive && <span className="text-[9px] opacity-40">{ownerTrain.name}</span>}
                  </span>
                )
              }

              // Edit mode — one row per stop
              return (
                <div key={i} className="flex items-center gap-1">
                  <input type="number" value={s.value} onChange={e => setStopField(i, 'value', e.target.value)}
                    className={`${inputCls} w-12`} />
                  {s.mult > 1 && (
                    <span className={`${labelCls} flex items-center gap-0.5`}>
                      ×<input type="number" value={s.mult} onChange={e => setStopField(i, 'mult', e.target.value)}
                        className={`${inputCls} w-8`} min="1" />
                    </span>
                  )}
                  {s.bonus > 0 && (
                    <span className={`${labelCls} flex items-center gap-0.5`}>
                      +<input type="number" value={s.bonus} onChange={e => setStopField(i, 'bonus', e.target.value)}
                        className={`${inputCls} w-10`} />
                    </span>
                  )}
                  <button onClick={() => setStopField(i, 'mult', s.mult > 1 ? 1 : 2)}
                    className={`text-[10px] px-1 py-0.5 rounded ${s.mult > 1 ? (m ? 'bg-green-900 text-green-300' : 'bg-blue-700 text-white') : (m ? 'text-blue-600' : 'text-broker-text-muted/40 hover:text-broker-text-muted')}`}
                    title="Toggle multiplier">×</button>
                  <button onClick={() => setStopField(i, 'bonus', s.bonus > 0 ? 0 : 20)}
                    className={`text-[10px] px-1 py-0.5 rounded ${s.bonus > 0 ? (m ? 'bg-green-900 text-green-300' : 'bg-blue-700 text-white') : (m ? 'text-blue-600' : 'text-broker-text-muted/40 hover:text-broker-text-muted')}`}
                    title="Toggle bonus">+</button>
                  <input type="text" value={s.name} onChange={e => setStopField(i, 'name', e.target.value)}
                    placeholder="" className={`${nameInputCls} w-14`} />
                  {effective !== s.value && <span className={`${labelCls} font-bold`}>= {effective}</span>}
                  <button onClick={() => removeStop(i)} className="text-red-400 text-[10px] ml-auto">×</button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={labelCls}>Click values above to add stops</div>
        )}
      </Panel>

      {/* Trains */}
      <Panel m={m} title="Trains">
        <div className="space-y-2">
          {trains.map((t, i) => {
            const rev = trainRevenue(t)
            const isActive = activeTrain === t.id
            return (
              <div key={t.id} className={`rounded p-2 ${isActive
                ? (m ? 'bg-green-900/30 border border-green-700' : 'bg-blue-900/20 border border-blue-600')
                : (m ? 'bg-blue-900/20' : 'bg-broker-bg')
              }`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="text" value={t.name} onChange={e => setTrainField(i, 'name', e.target.value)}
                    className={`${nameInputCls} w-8 font-bold`} />
                  <span className={labelCls}>stops</span>
                  <input type="number" value={t.stops} onChange={e => setTrainField(i, 'stops', e.target.value)}
                    className={`${inputCls} w-8`} min="1" />
                  {t.multiplier > 1 && (
                    <>
                      <span className={labelCls}>×</span>
                      <input type="number" value={t.multiplier} onChange={e => setTrainField(i, 'multiplier', e.target.value)}
                        className={`${inputCls} w-6`} min="1" />
                    </>
                  )}
                  <span className={labelCls}>bonus</span>
                  <input type="number" value={t.bonus || ''} onChange={e => setTrainField(i, 'bonus', e.target.value)}
                    placeholder="0" className={`${inputCls} w-8`} />

                  <button onClick={() => setActiveTrain(isActive ? null : t.id)}
                    className={`text-[10px] px-2 py-0.5 rounded font-medium ${isActive
                      ? (m ? 'bg-green-700 text-white' : 'bg-blue-600 text-white')
                      : (m ? 'bg-blue-800 text-blue-300' : 'bg-broker-surface-hover text-broker-text')
                    }`}>
                    {isActive ? 'done' : 'route'}
                  </button>
                  {t.route.length > 0 && (
                    <button onClick={() => clearRoute(t.id)} className="text-[10px] text-red-400 px-1">clear</button>
                  )}
                  <span className={`ml-auto font-bold ${m ? 'text-white' : 'text-white'}`}>
                    {rev > 0 ? fmt(rev) : '—'}
                  </span>
                  <button onClick={() => removeTrain(i)} className="text-[10px] text-red-400 px-1">×</button>
                </div>

                {/* Route display */}
                {t.route.length > 0 && (
                  <div className={`mt-1 text-[10px] ${m ? 'text-blue-400' : 'text-broker-text-muted'}`}>
                    {t.route.map((si, ri) => {
                      const s = stops[si]
                      if (!s) return null
                      const val = s.value * (s.mult || 1) + (s.bonus || 0)
                      return (
                        <span key={ri}>
                          {ri > 0 && ' → '}
                          <span className="font-bold">{val}</span>
                          {s.name && <span className={m ? ' text-blue-600' : ' text-broker-text-muted/60'}> {s.name}</span>}
                        </span>
                      )
                    })}
                    {t.bonus > 0 && <span> + {t.bonus} bonus</span>}
                    {t.multiplier > 1 && <span> ×{t.multiplier}</span>}
                    <span className="ml-2">({t.route.length}/{t.stops})</span>
                  </div>
                )}

                {isActive && t.route.length === 0 && stops.length > 0 && (
                  <div className={`mt-1 text-[10px] ${m ? 'text-green-400' : 'text-blue-400'}`}>
                    Click stops above to build route
                  </div>
                )}
              </div>
            )
          })}
          <div className="flex gap-2">
            <button onClick={addTrain} className={btnSmall}>+ Train</button>
            <button onClick={() => setTrains(prev => prev.map(t => ({ ...t, multiplier: 2 })))}
              className={btnSmall} title="Set all trains to ×2 (D-trains)">all ×2</button>
          </div>
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
