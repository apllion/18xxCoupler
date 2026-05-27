// RouteCalcTab — per-corp route/revenue calculator.
// Each train is a card. Active card shows stop buttons to build route.
// Inactive card shows route total and stop values.

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
      <h2 className={m ? 'text-green-400 font-bold' : 'text-white font-bold text-lg'}>Route Calculator</h2>
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
          trains: c.trains.map(t => ({ id: `${c.sym}-${t.id}`, name: t.name, stops: [] })),
        }
      }
    }
    return { corp: { sym: '', color: '#888' }, trains: [{ id: '1', name: '2', stops: [] }] }
  }

  const init = useMemo(initState, [activeSym])
  const [corp, setCorp] = useState(init.corp)
  const [trains, setTrains] = useState(init.trains)
  const [activeTrain, setActiveTrain] = useState(null)
  const [customStop, setCustomStop] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null) // 'trainId-stopIdx'

  const handleStopDelete = (trainId, stopIdx) => {
    const key = `${trainId}-${stopIdx}`
    if (pendingDelete === key) {
      removeStopFromTrain(trainId, stopIdx)
      setPendingDelete(null)
    } else {
      setPendingDelete(key)
      setTimeout(() => setPendingDelete(prev => prev === key ? null : prev), 1500)
    }
  }

  useEffect(() => {
    const s = initState()
    setCorp(s.corp); setTrains(s.trains); setActiveTrain(null)
  }, [activeSym])

  useEffect(() => {
    if (corp.sym) saveRoutes(corp.sym, { corp, trains })
  }, [corp.sym, trains])

  // --- Train ops ---
  const addTrain = () => setTrains(prev => [...prev, { id: String(Date.now()), name: '', stops: [] }])
  const removeTrain = (idx) => {
    if (trains[idx]?.id === activeTrain) setActiveTrain(null)
    setTrains(prev => prev.filter((_, i) => i !== idx))
  }
  const addStopToTrain = (trainId, value) => {
    if (!value || value <= 0) return
    setTrains(prev => prev.map(t => t.id === trainId ? { ...t, stops: [...t.stops, value] } : t))
  }
  const removeStopFromTrain = (trainId, stopIdx) => {
    setTrains(prev => prev.map(t => t.id === trainId ? { ...t, stops: t.stops.filter((_, i) => i !== stopIdx) } : t))
  }
  const clearTrain = (trainId) => {
    setTrains(prev => prev.map(t => t.id === trainId ? { ...t, stops: [] } : t))
  }

  // --- Revenue ---
  const trainRev = (t) => t.stops.reduce((s, v) => s + v, 0)
  const total = trains.reduce((s, t) => s + trainRev(t), 0)

  // --- Styles ---
  const labelCls = m ? 'text-blue-400 text-[10px]' : 'text-broker-text-muted text-[10px]'
  const nameInput = m
    ? 'w-10 bg-black/30 border border-blue-800 rounded px-1 py-0.5 text-xs text-blue-300 focus:outline-none'
    : 'w-10 bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-white focus:outline-none'
  const quickValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

  return (
    <>
      {/* Total */}
      <div className={m
        ? 'bg-green-900/30 border border-green-800 rounded p-2 flex items-center gap-3 flex-wrap'
        : 'bg-broker-surface border border-broker-border rounded-lg p-3 flex items-center gap-3 flex-wrap'
      }>
        <span className={`text-2xl font-bold ${m ? 'text-white' : 'text-white'}`}>{fmt(total)}</span>
        <span className={labelCls}>{fmt(Math.floor(total / 10))}/share</span>
        {trains.filter(t => t.stops.length > 0).map(t => (
          <span key={t.id} className="text-xs">{t.name || '?'}: {fmt(trainRev(t))}</span>
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

      {/* Train cards */}
      {trains.map((t, i) => {
        const rev = trainRev(t)
        const isActive = activeTrain === t.id
        return (
          <div key={t.id} className={m
            ? `bg-blue-900/30 border ${isActive ? 'border-green-600' : 'border-blue-800'} rounded p-2`
            : `bg-broker-surface border ${isActive ? 'border-blue-500' : 'border-broker-border'} rounded-lg p-3`
          }>
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <input type="text" value={t.name}
                onChange={e => setTrains(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                placeholder="train" className={`${nameInput} font-bold`} />
              <button onClick={() => setActiveTrain(isActive ? null : t.id)}
                className={`text-[10px] px-2 py-0.5 rounded font-medium ${isActive
                  ? (m ? 'bg-green-700 text-white' : 'bg-blue-600 text-white')
                  : (m ? 'bg-blue-800 text-blue-300' : 'bg-broker-surface-hover text-broker-text')
                }`}>{isActive ? 'done' : 'edit'}</button>
              {t.stops.length > 0 && (
                <button onClick={() => {
                  const key = `clear-${t.id}`
                  if (pendingDelete === key) { clearTrain(t.id); setPendingDelete(null) }
                  else { setPendingDelete(key); setTimeout(() => setPendingDelete(prev => prev === key ? null : prev), 1500) }
                }} className={`text-[10px] transition-colors ${pendingDelete === `clear-${t.id}` ? 'text-red-400 font-bold animate-pulse' : 'text-broker-text-muted hover:text-red-400'}`}>
                  {pendingDelete === `clear-${t.id}` ? 'clear?' : 'clear'}
                </button>
              )}
              <span className={`ml-auto text-lg font-bold ${m ? 'text-white' : 'text-white'}`}>
                {rev > 0 ? fmt(rev) : '—'}
              </span>
              <button onClick={() => removeTrain(i)} className="text-[10px] text-red-400">×</button>
            </div>

            {isActive ? (
              <>
                {/* Active: stop value buttons */}
                <div className="flex flex-wrap gap-1 mb-1">
                  {quickValues.map(v => (
                    <button key={v} onClick={() => addStopToTrain(t.id, v)}
                      className={m
                        ? 'text-xs bg-blue-900/50 text-blue-300 hover:bg-blue-800 px-2 py-1 rounded min-w-[2rem]'
                        : 'text-xs bg-broker-surface-hover text-broker-text hover:text-white px-2 py-1 rounded min-w-[2rem]'
                      }>{v}</button>
                  ))}
                </div>
                {/* Multiply route + custom input */}
                <div className="flex flex-wrap gap-1 mb-1">
                  <button onClick={() => setTrains(prev => prev.map(x => x.id === t.id ? { ...x, stops: [...x.stops, ...x.stops] } : x))}
                    disabled={t.stops.length === 0}
                    className={m
                      ? 'text-[10px] bg-blue-800 text-blue-300 hover:bg-blue-700 disabled:opacity-30 px-2 py-0.5 rounded'
                      : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white disabled:opacity-30 px-2 py-0.5 rounded'
                    }>×2</button>
                  <button onClick={() => setTrains(prev => prev.map(x => x.id === t.id ? { ...x, stops: [...x.stops, ...x.stops, ...x.stops] } : x))}
                    disabled={t.stops.length === 0}
                    className={m
                      ? 'text-[10px] bg-blue-800 text-blue-300 hover:bg-blue-700 disabled:opacity-30 px-2 py-0.5 rounded'
                      : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white disabled:opacity-30 px-2 py-0.5 rounded'
                    }>×3</button>
                  <input type="number" value={customStop}
                    onChange={e => setCustomStop(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { addStopToTrain(t.id, parseInt(customStop) || 0); setCustomStop('') } }}
                    placeholder="other" className={`${nameInput} w-12`} />
                  <button onClick={() => { addStopToTrain(t.id, parseInt(customStop) || 0); setCustomStop('') }}
                    className={m
                      ? 'text-[10px] bg-green-900/50 text-green-300 hover:bg-green-800 px-2 py-0.5 rounded'
                      : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white px-2 py-0.5 rounded'
                    }>add</button>
                </div>
                {/* Route stops — with × to remove */}
                {t.stops.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.stops.map((v, si) => {
                      const isAlarm = pendingDelete === `${t.id}-${si}`
                      return (
                        <button key={si} onClick={() => handleStopDelete(t.id, si)}
                          className={`text-xs px-2 py-0.5 rounded font-bold transition-colors ${
                            isAlarm
                              ? 'bg-red-600 text-white animate-pulse'
                              : m ? 'bg-green-800 text-green-200' : 'bg-blue-600 text-white'
                          }`}>
                          {v}{isAlarm ? ' ×' : ''}
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              /* Inactive: just show stops */
              t.stops.length > 0 && (
                <div className={`text-[10px] ${m ? 'text-blue-400' : 'text-broker-text-muted'}`}>
                  {t.stops.join(' + ')} = {fmt(rev)}
                </div>
              )
            )}
          </div>
        )
      })}

      <button onClick={addTrain}
        className={m
          ? 'text-[10px] bg-green-900/50 text-green-300 hover:bg-green-800 px-2 py-1 rounded'
          : 'text-[10px] bg-broker-surface-hover text-broker-text hover:text-white px-2 py-1 rounded'
        }>+ Train</button>
    </>
  )
}
