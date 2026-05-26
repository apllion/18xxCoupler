// RouteCalcTab — standalone route/revenue calculator.
// Enter stops with values, pick train type, calculate best revenue.
// Pre-fills from game if loaded, otherwise fully manual.

import { useState } from 'react'
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

const COLORS = ['#d81e3e', '#0189d1', '#237333', '#FFF500', '#800080', '#333', '#ccc', '#ff8c00']

function RouteCalc({ game, fmt, m }) {
  // Trains — pre-fill from game's corp trains or manual
  const initTrains = () => {
    if (game) {
      const trains = []
      for (const c of game.corporations.filter(c => c.floated)) {
        for (const t of c.trains) {
          trains.push({ id: `${c.sym}-${t.id}`, corp: c.sym, color: c.color, name: t.name, stops: t.distance || parseInt(t.name) || 2, multiplier: t.multiplier || 1 })
        }
      }
      if (trains.length > 0) return trains
    }
    return [
      { id: '1', corp: '', color: COLORS[0], name: '2', stops: 2, multiplier: 1 },
      { id: '2', corp: '', color: COLORS[1], name: '3', stops: 3, multiplier: 1 },
    ]
  }

  // Stops — city/town values
  const initStops = () => [
    { id: '1', name: 'City A', value: 30, type: 'city' },
    { id: '2', name: 'City B', value: 40, type: 'city' },
    { id: '3', name: 'City C', value: 20, type: 'city' },
    { id: '4', name: 'Town D', value: 10, type: 'town' },
    { id: '5', name: 'City E', value: 50, type: 'city' },
    { id: '6', name: 'City F', value: 30, type: 'city' },
  ]

  const [trains, setTrains] = useState(initTrains)
  const [stops, setStops] = useState(initStops)
  const [routes, setRoutes] = useState([]) // each route: { trainId, stopIds[], revenue }
  const [editingRoute, setEditingRoute] = useState(null) // trainId being edited

  let nextId = 100

  // --- Helpers ---
  const setTrainField = (idx, field, val) => {
    setTrains(prev => prev.map((t, i) => i === idx ? { ...t, [field]: field === 'name' || field === 'corp' ? val : (parseInt(val) || 0) } : t))
  }
  const addTrain = () => {
    setTrains(prev => [...prev, { id: String(Date.now()), corp: '', color: COLORS[prev.length % COLORS.length], name: '2', stops: 2, multiplier: 1 }])
  }
  const removeTrain = (idx) => {
    const tid = trains[idx].id
    setTrains(prev => prev.filter((_, i) => i !== idx))
    setRoutes(prev => prev.filter(r => r.trainId !== tid))
  }

  const setStopField = (idx, field, val) => {
    setStops(prev => prev.map((s, i) => i === idx ? { ...s, [field]: field === 'name' ? val : field === 'type' ? val : (parseInt(val) || 0) } : s))
  }
  const addStop = () => {
    setStops(prev => [...prev, { id: String(Date.now()), name: `Stop ${prev.length + 1}`, value: 0, type: 'city' }])
  }
  const removeStop = (idx) => {
    const sid = stops[idx].id
    setStops(prev => prev.filter((_, i) => i !== idx))
    setRoutes(prev => prev.map(r => ({ ...r, stopIds: r.stopIds.filter(id => id !== sid) })))
  }

  // --- Route building ---
  const toggleStopInRoute = (trainId, stopId) => {
    setRoutes(prev => {
      const existing = prev.find(r => r.trainId === trainId)
      const train = trains.find(t => t.id === trainId)
      const maxStops = train?.stops || 99

      if (existing) {
        const has = existing.stopIds.includes(stopId)
        let newStopIds
        if (has) {
          newStopIds = existing.stopIds.filter(id => id !== stopId)
        } else {
          if (existing.stopIds.length >= maxStops) return prev // at limit
          newStopIds = [...existing.stopIds, stopId]
        }
        const rev = calcRouteRevenue(newStopIds, train)
        return prev.map(r => r.trainId === trainId ? { ...r, stopIds: newStopIds, revenue: rev } : r)
      } else {
        const rev = calcRouteRevenue([stopId], train)
        return [...prev, { trainId, stopIds: [stopId], revenue: rev }]
      }
    })
  }

  const calcRouteRevenue = (stopIds, train) => {
    let rev = 0
    for (const sid of stopIds) {
      const stop = stops.find(s => s.id === sid)
      if (stop) rev += stop.value
    }
    return rev * (train?.multiplier || 1)
  }

  // Recalc all routes when stops change
  const recalcAll = () => {
    setRoutes(prev => prev.map(r => {
      const train = trains.find(t => t.id === r.trainId)
      return { ...r, revenue: calcRouteRevenue(r.stopIds, train) }
    }))
  }

  const totalRevenue = routes.reduce((s, r) => s + r.revenue, 0)

  // --- Styles ---
  const inputCls = m
    ? 'w-14 bg-black/30 border border-blue-800 rounded px-1 py-0.5 text-xs text-blue-300 text-right focus:outline-none focus:border-green-600'
    : 'w-14 bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-white text-right focus:outline-none focus:border-blue-500'
  const nameInputCls = m
    ? 'w-20 bg-black/30 border border-blue-800 rounded px-1 py-0.5 text-xs text-yellow-300 focus:outline-none focus:border-green-600'
    : 'w-20 bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500'
  const labelCls = m ? 'text-blue-400 text-[10px]' : 'text-broker-text-muted text-[10px]'
  const btnCls = m
    ? 'text-[10px] text-blue-400 hover:text-blue-300 px-1'
    : 'text-[10px] text-broker-text-muted hover:text-white px-1'

  return (
    <>
      {/* Stops */}
      <Panel m={m} title="Stops">
        <div className="space-y-1">
          {stops.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <input type="text" value={s.name} onChange={e => { setStopField(i, 'name', e.target.value); recalcAll() }}
                className={nameInputCls} />
              <span className={labelCls}>value</span>
              <input type="number" value={s.value || ''} onChange={e => { setStopField(i, 'value', e.target.value); recalcAll() }}
                className={inputCls} />
              <select value={s.type} onChange={e => setStopField(i, 'type', e.target.value)}
                className={m
                  ? 'bg-black/30 border border-blue-800 rounded px-1 py-0.5 text-xs text-blue-300'
                  : 'bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-white'
                }>
                <option value="city">City</option>
                <option value="town">Town</option>
                <option value="offboard">Offboard</option>
              </select>
              <button onClick={() => removeStop(i)} className={`${btnCls} text-red-400`}>×</button>
            </div>
          ))}
          <button onClick={addStop} className={m
            ? 'text-[10px] bg-green-900/50 text-green-300 hover:bg-green-800 px-2 py-0.5 rounded'
            : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white px-2 py-0.5 rounded'
          }>+ Stop</button>
        </div>
      </Panel>

      {/* Trains */}
      <Panel m={m} title="Trains">
        <div className="space-y-1">
          {trains.map((t, i) => {
            const route = routes.find(r => r.trainId === t.id)
            const isEditing = editingRoute === t.id
            return (
              <div key={t.id}>
                <div className="flex items-center gap-2">
                  {t.corp && <span style={{ color: t.color }} className="font-bold text-[10px] w-8">{t.corp}</span>}
                  <span className={labelCls}>train</span>
                  <input type="text" value={t.name} onChange={e => setTrainField(i, 'name', e.target.value)}
                    className={`${nameInputCls} w-10`} />
                  <span className={labelCls}>stops</span>
                  <input type="number" value={t.stops || ''} onChange={e => setTrainField(i, 'stops', e.target.value)}
                    className={`${inputCls} w-10`} min="1" />
                  {t.multiplier > 1 && <span className={labelCls}>×{t.multiplier}</span>}
                  <button onClick={() => setEditingRoute(isEditing ? null : t.id)}
                    className={`text-[10px] px-1.5 py-0.5 rounded ${isEditing
                      ? (m ? 'bg-green-900 text-green-300' : 'bg-blue-600 text-white')
                      : (m ? 'bg-blue-900/30 text-blue-400' : 'bg-broker-surface-hover text-broker-text-muted')
                    }`}>
                    {isEditing ? 'done' : 'route'}
                  </button>
                  <span className={`font-bold ml-auto ${m ? 'text-white' : 'text-white'}`}>
                    {route ? fmt(route.revenue) : '—'}
                  </span>
                  <button onClick={() => removeTrain(i)} className={`${btnCls} text-red-400`}>×</button>
                </div>

                {/* Route picker — click stops to add/remove */}
                {isEditing && (
                  <div className="flex flex-wrap gap-1 mt-1 ml-4">
                    {stops.map(s => {
                      const inRoute = route?.stopIds.includes(s.id)
                      const atLimit = !inRoute && route && route.stopIds.length >= t.stops
                      return (
                        <button key={s.id}
                          onClick={() => toggleStopInRoute(t.id, s.id)}
                          disabled={atLimit}
                          className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                            inRoute
                              ? (m ? 'bg-green-800 text-green-200' : 'bg-blue-600 text-white')
                              : atLimit
                                ? (m ? 'bg-blue-950 text-blue-800' : 'bg-broker-bg text-broker-text-muted/30')
                                : (m ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800' : 'bg-broker-surface-hover text-broker-text hover:text-white')
                          }`}>
                          {s.name} ({fmt(s.value)})
                        </button>
                      )
                    })}
                    <span className={`${labelCls} self-center ml-1`}>
                      {route?.stopIds.length || 0}/{t.stops}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
          <button onClick={addTrain} className={m
            ? 'text-[10px] bg-green-900/50 text-green-300 hover:bg-green-800 px-2 py-0.5 rounded'
            : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white px-2 py-0.5 rounded'
          }>+ Train</button>
        </div>
      </Panel>

      {/* Total */}
      <Panel m={m} title="Total Revenue">
        <div className="flex items-center gap-4 flex-wrap">
          <span className={`text-xl font-bold ${m ? 'text-white' : 'text-white'}`}>{fmt(totalRevenue)}</span>
          <span className={labelCls}>{fmt(Math.floor(totalRevenue / 10))}/share</span>
          {routes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {routes.filter(r => r.stopIds.length > 0).map(r => {
                const train = trains.find(t => t.id === r.trainId)
                return (
                  <span key={r.trainId} className="text-xs">
                    <span style={{ color: train?.color }} className="font-bold">{train?.corp || train?.name}</span>
                    {' '}{fmt(r.revenue)}
                    <span className={labelCls}> ({r.stopIds.length} stops)</span>
                  </span>
                )
              })}
            </div>
          )}
        </div>
        {/* Use revenue — send back to corp view */}
        {totalRevenue > 0 && game && (
          <div className="flex flex-wrap gap-1 mt-2">
            {/* One button per corp that has trains in this calc */}
            {[...new Set(trains.filter(t => t.corp).map(t => t.corp))].map(corpSym => {
              const corpRoutes = routes.filter(r => {
                const t = trains.find(x => x.id === r.trainId)
                return t?.corp === corpSym
              })
              const corpRev = corpRoutes.reduce((s, r) => s + r.revenue, 0)
              if (corpRev <= 0) return null
              const corp = game.corporations.find(c => c.sym === corpSym)
              return (
                <button key={corpSym}
                  onClick={() => {
                    useUIStore.getState().setRouteRevenue(corpSym, corpRev)
                    useUIStore.getState().setActiveCorp(corpSym)
                    useUIStore.getState().setActiveTab('corps')
                  }}
                  className={m
                    ? 'text-xs bg-green-900/80 text-green-300 hover:bg-green-800 px-3 py-1.5 rounded font-medium'
                    : 'text-xs bg-green-700 text-white hover:bg-green-600 px-3 py-1.5 rounded font-medium'
                  }>
                  Use {fmt(corpRev)} for <span style={{ color: corp?.color }} className="font-bold">{corpSym}</span> → Pay/Withhold
                </button>
              )
            })}
            {/* Fallback if no corps tagged */}
            {trains.every(t => !t.corp) && (
              <span className={labelCls}>Tag trains with corp names to send revenue back</span>
            )}
          </div>
        )}
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
