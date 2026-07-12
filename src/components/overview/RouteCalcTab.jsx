// RouteCalcTab — per-corp route/revenue calculator.
// Each train is a card. Active card shows stop buttons to build route.
// Inactive card shows route total and stop values.

import { useState, useEffect, useMemo } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { formatCurrency } from '../../utils/currency.js'

export default function RouteCalcTab() {
  const game = useGameStore((s) => s.game)
  const fmt = (n) => formatCurrency(n, game?.title?.currencyFormat || '$')

  return (
    <div className="text-sm p-3 space-y-4 overflow-y-auto bg-broker-bg h-full">
      <h2 className="text-broker-text font-bold text-lg">Route Calculator</h2>
      <RouteCalc game={game} fmt={fmt} />
    </div>
  )
}

function RouteCalc({ game, fmt }) {
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
          trains: c.trains.map(t => ({ id: `${c.sym}-${t.id}`, name: t.name, stops: [], mult: t.multiplier || 1 })),
        }
      }
    }
    return { corp: { sym: '', color: '#888' }, trains: [{ id: '1', name: '2', stops: [], mult: 1 }] }
  }

  const init = useMemo(() => initState(), [activeSym])
  const [corp, setCorp] = useState(init.corp)
  const [trains, setTrains] = useState(init.trains)
  const [activeTrain, setActiveTrain] = useState(null)
  const [customStop, setCustomStop] = useState('')
  const [newCorpName, setNewCorpName] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null) // 'trainId-stopIdx'

  const loadFromGame = () => {
    if (!game) return
    const sym = corp.sym || useUIStore.getState().activeCorpSym
    const c = sym && game.corporations.find(x => x.sym === sym && x.floated)
    if (c && c.trains.length > 0) {
      setCorp({ sym: c.sym, color: c.color })
      setTrains(c.trains.map(t => ({ id: `${c.sym}-${t.id}`, name: t.name, stops: [], mult: t.multiplier || 1 })))
      setActiveTrain(null)
    }
  }

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

  // Detect stale routes: trains in game changed vs saved
  const trainsMismatch = useMemo(() => {
    if (!game || !corp.sym) return false
    const c = game.corporations.find(x => x.sym === corp.sym && x.floated)
    if (!c) return false
    const gameTrainNames = c.trains.map(t => t.name).sort().join(',')
    const calcTrainNames = trains.map(t => t.name).sort().join(',')
    return gameTrainNames !== calcTrainNames && c.trains.length > 0
  }, [game, corp.sym, trains])

  // --- Train ops ---
  const addTrain = () => setTrains(prev => [...prev, { id: String(Date.now()), name: '', stops: [], mult: 1 }])
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

  // Stop value buttons — title-aware defaults or standard
  const titleStopValues = game?.title?.routeStopValues
  const quickValues = titleStopValues || [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  const [extraValues, setExtraValues] = useState([])
  const allQuickValues = [...new Set([...quickValues, ...extraValues])].sort((a, b) => a - b)

  const addCustomValue = (v) => {
    const n = parseInt(v) || 0
    if (n <= 0) return
    if (!extraValues.includes(n) && !quickValues.includes(n)) {
      setExtraValues(prev => [...prev, n].slice(-4))
    }
  }

  // --- Revenue ---
  const trainRev = (t) => t.stops.reduce((s, v) => s + v, 0) * (t.mult || 1)
  const total = trains.reduce((s, t) => s + trainRev(t), 0)

  // --- Styles ---
  const labelCls = 'text-broker-text-muted text-[10px]'
  const nameInput = 'w-10 bg-broker-bg border border-broker-border rounded px-1 py-0.5 text-xs text-white focus:outline-none'
  return (
    <>
      {/* Trains changed warning */}
      {trainsMismatch && (
        <div className="bg-amber-900/40 border border-amber-600 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="text-amber-300 text-xs font-medium">Trains changed in game</span>
          <button onClick={loadFromGame} className="text-xs bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded font-bold"
          >Reload trains</button>
        </div>
      )}

      {/* Load from game */}
      {!trainsMismatch && game && corp.sym && game.corporations.some(c => c.sym === corp.sym && c.floated) && (
        <button onClick={loadFromGame} className="text-xs bg-broker-surface-hover text-broker-text hover:text-white px-3 py-1.5 rounded self-start"
        >Load {corp.sym} trains from game</button>
      )}

      {/* Total */}
      <div className="bg-broker-surface border border-broker-border rounded-lg p-3 flex items-center gap-3 flex-wrap">
        <span className={`text-2xl font-bold text-broker-text`}>{fmt(total)}</span>
        <span className={labelCls}>{fmt(Math.floor(total / 10))}/share</span>
        {trains.filter(t => t.stops.length > 0).map(t => (
          <span key={t.id} className="text-xs">{t.name || '?'}: {fmt(trainRev(t))}</span>
        ))}
        {total > 0 && game && corp.sym && (
          <button onClick={() => {
            useUIStore.getState().setRouteRevenue(corp.sym, total)
            useUIStore.getState().setActiveTab('overview')
          }} className="ml-auto text-xs bg-green-700 text-white hover:bg-green-600 px-3 py-1.5 rounded font-bold"
          >→ {corp.sym} Pay/Withhold</button>
        )}
      </div>

      {/* Corp selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Game corps */}
        {game && game.corporations.filter(c => c.floated).map(c => (
          <button key={c.sym}
            onClick={() => useUIStore.getState().setActiveCorp(c.sym)}
            className={`text-xs px-3 py-1.5 rounded font-medium ${corp.sym === c.sym ? 'ring-2 ring-white' : savedRoutes[c.sym] ? 'opacity-80' : 'opacity-50'}`}
            style={{ backgroundColor: c.color, color: c.textColor || '#fff' }}>
            {c.sym}{savedRoutes[c.sym] && corp.sym !== c.sym ? '*' : ''}
          </button>
        ))}
        {/* Saved standalone corps */}
        {Object.keys(savedRoutes).filter(sym => !game || !game.corporations.some(c => c.sym === sym)).map(sym => (
          <span key={sym} className="inline-flex items-center gap-0">
            <button
              onClick={() => { setCorp(savedRoutes[sym].corp); setTrains(savedRoutes[sym].trains); setActiveTrain(null) }}
              className={`text-xs px-3 py-1.5 rounded-l font-medium ${corp.sym === sym ? 'ring-2 ring-white' : 'opacity-80'}`}
              style={{ backgroundColor: savedRoutes[sym].corp?.color || '#888', color: '#fff' }}>
              {sym}
            </button>
            <button onClick={() => {
              const key = `del-corp-${sym}`
              if (pendingDelete === key) {
                useUIStore.getState().saveRoutes(sym, undefined)
                // switch away if deleting current
                if (corp.sym === sym) { setCorp({ sym: '', color: '#888' }); setTrains([{ id: '1', name: '2', stops: [], mult: 1 }]) }
                setPendingDelete(null)
              } else {
                setPendingDelete(key)
                setTimeout(() => setPendingDelete(prev => prev === key ? null : prev), 1500)
              }
            }} className={`text-[9px] px-1 py-1 rounded-r transition-colors ${
              pendingDelete === `del-corp-${sym}`
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-broker-bg text-broker-text-muted/40 hover:text-red-400'
            }`}>{pendingDelete === `del-corp-${sym}` ? '×?' : '×'}</button>
          </span>
        ))}
        {/* Add new corp */}
        <input type="text" value={newCorpName}
          onChange={e => setNewCorpName(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter' && newCorpName.trim()) {
            // Save current corp first
            if (corp.sym) saveRoutes(corp.sym, { corp, trains })
            const sym = newCorpName.trim()
            setCorp({ sym, color: '#888' })
            setTrains([{ id: String(Date.now()), name: '2', stops: [], mult: 1 }])
            setActiveTrain(null)
            setNewCorpName('')
          }}}
          placeholder="corp" className={`${nameInput} w-12`} />
        <button
          disabled={!newCorpName.trim()}
          onClick={() => {
            if (!newCorpName.trim()) return
            if (corp.sym) saveRoutes(corp.sym, { corp, trains })
            const sym = newCorpName.trim().toUpperCase()
            setCorp({ sym, color: '#888' })
            setTrains([{ id: String(Date.now()), name: '2', stops: [], mult: 1 }])
            setActiveTrain(null)
            setNewCorpName('')
          }} className="text-sm bg-broker-surface-hover text-broker-text hover:text-white disabled:opacity-30 px-3 py-1.5 rounded"
          >+ Corp</button>
      </div>

      {/* Train cards */}
      {trains.map((t, i) => {
        const rev = trainRev(t)
        const isActive = activeTrain === t.id
        return (
          <div key={t.id} className={`bg-broker-surface border ${isActive ? 'border-blue-500' : 'border-broker-border'} rounded-lg p-3`}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <input type="text" value={t.name}
                onChange={e => setTrains(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                placeholder="train" className={`${nameInput} font-bold`} />
              <button onClick={() => setActiveTrain(isActive ? null : t.id)}
                className={`text-sm px-3 py-1.5 rounded font-medium ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-broker-surface-hover text-broker-text'
                }`}>{isActive ? 'done' : 'edit'}</button>
              {t.stops.length > 0 && (
                <button onClick={() => {
                  const key = `clear-${t.id}`
                  if (pendingDelete === key) { clearTrain(t.id); setPendingDelete(null) }
                  else { setPendingDelete(key); setTimeout(() => setPendingDelete(prev => prev === key ? null : prev), 1500) }
                }} className={`text-sm px-3 py-1.5 transition-colors ${pendingDelete === `clear-${t.id}` ? 'text-red-400 font-bold animate-pulse' : 'text-broker-text-muted hover:text-red-400'}`}>
                  {pendingDelete === `clear-${t.id}` ? 'clear?' : 'clear'}
                </button>
              )}
              <span className={`ml-auto text-lg font-bold text-broker-text`}>
                {rev > 0 ? fmt(rev) : '—'}
              </span>
              <button onClick={() => {
                const key = `train-${t.id}`
                if (pendingDelete === key) { removeTrain(i); setPendingDelete(null) }
                else { setPendingDelete(key); setTimeout(() => setPendingDelete(prev => prev === key ? null : prev), 1500) }
              }} className={`text-[10px] transition-colors ${pendingDelete === `train-${t.id}` ? 'text-red-500 font-bold animate-pulse' : 'text-broker-text-muted/40 hover:text-red-400'}`}>
                {pendingDelete === `train-${t.id}` ? '× delete?' : '×'}
              </button>
            </div>

            {isActive ? (
              <>
                {/* Stop value buttons + custom input */}
                <div className="flex flex-wrap gap-1 mb-1">
                  {allQuickValues.map(v => (
                    <button key={v} onClick={() => addStopToTrain(t.id, v)}
                      className={`text-sm ${extraValues.includes(v) ? 'bg-blue-800 text-blue-200' : 'bg-broker-surface-hover text-broker-text'} hover:text-white px-3 py-2 rounded min-w-[2.5rem]`}>{v}</button>
                  ))}
                  <input type="number" value={customStop}
                    onChange={e => setCustomStop(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') {
                      const v = parseInt(customStop) || 0
                      if (v > 0) { addCustomValue(v); addStopToTrain(t.id, v); setCustomStop('') }
                    }}}
                    placeholder="+" className={`${nameInput} w-12`} />
                  <button onClick={() => {
                    const v = parseInt(customStop) || 0
                    if (v > 0) { addCustomValue(v); addStopToTrain(t.id, v); setCustomStop('') }
                  }} className="text-sm bg-broker-surface-hover text-broker-text hover:text-white px-3 py-1.5 rounded"
                  >add</button>
                </div>
                {/* Multiplier */}
                <div className="flex flex-wrap gap-1 mb-1">
                  {[1, 2, 3, 4].map(x => (
                    <button key={x}
                      onClick={() => setTrains(prev => prev.map(tr => tr.id === t.id ? { ...tr, mult: x } : tr))}
                      className={`text-sm px-3 py-1.5 rounded font-medium ${
                        (t.mult || 1) === x
                          ? 'bg-blue-600 text-white'
                          : 'bg-broker-bg text-broker-text-muted'
                      }`}>×{x}</button>
                  ))}
                </div>
                {/* Route stops — with × to remove */}
                {t.stops.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.stops.map((v, si) => {
                      const isAlarm = pendingDelete === `${t.id}-${si}`
                      return (
                        <button key={si} onClick={() => handleStopDelete(t.id, si)}
                          className={`text-xs px-3 py-1.5 rounded font-bold transition-colors ${
                            isAlarm
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-blue-600 text-white'
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
                <div className={`text-[10px] text-broker-text-muted`}>
                  {t.stops.join(' + ')}{(t.mult || 1) > 1 ? ` ×${t.mult}` : ''} = {fmt(rev)}
                </div>
              )
            )}
          </div>
        )
      })}

      <div className="flex gap-2">
        <button onClick={addTrain}
          className="text-sm bg-broker-surface-hover text-broker-text hover:text-white px-3 py-1.5 rounded"
          >+ Train</button>
        {game && game.corporations.filter(c => c.floated && c.sym !== corp.sym).length > 0 && (
          <span className={labelCls + ' self-center'}>or switch corp above</span>
        )}
      </div>
    </>
  )
}
