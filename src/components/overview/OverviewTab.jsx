// OverviewTab — Lemmi-style dense single-screen interactive view.
// Full moderator: buy/sell shares, pay dividends, buy trains — all from the matrix.

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { useDispatch } from '../../hooks/useDispatch.js'
import { formatCurrency } from '../../utils/currency.js'
import { corpPrice, parPrices } from '../../engine/stockMarket.js'
import { currentPhase, trainLimit } from '../../engine/phase.js'
import { playerSharePercent, playerCertCount, isPresident } from '../../engine/player.js'
import { remainingCount, nextAvailableTrains } from '../../engine/depot.js'
import { roundLabel } from '../../engine/roundTracker.js'

export default function OverviewTab() {
  const game = useGameStore((s) => s.game)
  const undo = useGameStore((s) => s.undo)
  const canUndo = useGameStore((s) => s.canUndo)
  const dispatch = useDispatch()

  // Active context: which player + corp is selected for actions
  const [activePlayer, setActivePlayer] = useState(null)
  const [activeCorp, setActiveCorp] = useState(null)
  const [panel, setPanel] = useState(null) // null | 'share' | 'revenue' | 'train' | 'par'
  const [revenueInput, setRevenueInput] = useState('')

  if (!game) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const phase = currentPhase(game.phaseManager)
  const label = game.roundTracker ? roundLabel(game.roundTracker) : ''
  const limit = trainLimit(game.phaseManager)

  const corps = useMemo(() =>
    game.corporations
      .filter(c => c.ipoed || c.floated)
      .map(c => ({
        ...c,
        price: corpPrice(game.stockMarket, c.sym) || 0,
        pos: game.stockMarket.corpPositions[c.sym],
      }))
      .sort((a, b) => b.price - a.price),
    [game.corporations, game.stockMarket]
  )

  // Unfloated corps (for par)
  const unfloated = useMemo(() =>
    game.corporations.filter(c => !c.ipoed && !c.floated),
    [game.corporations]
  )

  const lastRevenue = useMemo(() => {
    const rev = {}
    for (let i = game.actionLog.length - 1; i >= 0; i--) {
      const a = game.actionLog[i].action
      if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && !rev[a.corpSym]) {
        rev[a.corpSym] = { amount: a.totalRevenue, type: a.type }
      }
    }
    return rev
  }, [game.actionLog])

  const corpPrivates = useMemo(() => {
    const map = {}
    for (const c of (game.companies || [])) {
      if (c.ownerType === 'corporation' && c.ownerId && !c.closed) {
        if (!map[c.ownerId]) map[c.ownerId] = []
        map[c.ownerId].push(c.sym)
      }
    }
    return map
  }, [game.companies])

  const playerPrivateValue = useMemo(() => {
    const map = {}
    for (const c of (game.companies || [])) {
      if (c.ownerType === 'player' && c.ownerId && !c.closed) {
        map[c.ownerId] = (map[c.ownerId] || 0) + (c.value || 0)
      }
    }
    return map
  }, [game.companies])

  const depotGroups = useMemo(() => {
    const groups = []
    const seen = new Set()
    for (const t of game.depot.upcoming) {
      if (!seen.has(t.name)) {
        seen.add(t.name)
        groups.push({
          name: t.name,
          price: t.price,
          count: remainingCount(game.depot, t.name),
          rustsOn: t.rustsOn,
        })
      }
    }
    return groups
  }, [game.depot])

  const colCount = corps.length

  // Click on player×corp cell → share actions
  function handleCellClick(playerId, corpSym) {
    setActivePlayer(playerId)
    setActiveCorp(corpSym)
    setPanel('share')
    setRevenueInput('')
  }

  // Click on revenue row → dividend actions
  function handleRevenueClick(corpSym) {
    setActiveCorp(corpSym)
    setActivePlayer(null)
    setPanel('revenue')
    setRevenueInput('')
  }

  // Click on trains row → buy train
  function handleTrainClick(corpSym) {
    setActiveCorp(corpSym)
    setActivePlayer(null)
    setPanel('train')
  }

  // Click on player name → par new corp
  function handlePlayerClick(playerId) {
    if (unfloated.length > 0) {
      setActivePlayer(playerId)
      setActiveCorp(null)
      setPanel('par')
    }
  }

  function closePanel() {
    setPanel(null)
    setActivePlayer(null)
    setActiveCorp(null)
    setRevenueInput('')
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'Escape') closePanel()
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && canUndo()) { e.preventDefault(); undo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canUndo, undo])

  return (
    <div className="font-mono text-xs leading-tight select-none overflow-x-auto h-full flex flex-col bg-blue-950">
      {/* Title bar */}
      <div className="bg-blue-900 text-blue-200 px-2 py-1 flex justify-between flex-shrink-0">
        <span>
          {game.title.title} — {label} — Phase {phase.name}
          <span className="text-blue-400 ml-2">Limit:{limit}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className={game.bank.cash <= 0 ? 'text-red-400 font-bold' : ''}>Bank: {fmt(game.bank.cash)}</span>
          <button onClick={undo} disabled={!canUndo()} className="text-blue-400 hover:text-white disabled:text-blue-800">Undo</button>
          <button onClick={useUIStore.getState().toggleViewMode}
            className="text-yellow-400 hover:text-yellow-200 font-bold">Broker</button>
        </span>
      </div>

      {/* Main matrix */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-950 text-green-400">
              <th className="text-left px-1 py-0.5 sticky left-0 bg-blue-950 z-10 min-w-[90px]">Player</th>
              <th className="px-1 text-right min-w-[44px]">Cash</th>
              <th className="px-1 text-right min-w-[28px]">Prv</th>
              <th className="px-1 text-center min-w-[32px]">Cert</th>
              {corps.map(c => (
                <th key={c.sym} className="px-1 text-center min-w-[40px] cursor-pointer hover:bg-blue-900" style={{ color: c.color }}
                  onClick={() => handleTrainClick(c.sym)}>
                  {c.sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Player rows */}
            {game.players.map(p => {
              const isPriority = p.id === game.priorityDeal
              const certs = playerCertCount(p)
              const isActive = activePlayer === p.id
              return (
                <tr key={p.id} className={`border-t border-blue-900/50 ${isActive ? 'bg-blue-900' : 'bg-blue-950'}`}>
                  <td className={`px-1 py-0.5 sticky left-0 z-10 cursor-pointer hover:bg-blue-900 ${isActive ? 'bg-blue-900' : 'bg-blue-950'} text-yellow-300`}
                    onClick={() => handlePlayerClick(p.id)}>
                    {isPriority && <span className="text-white">{'\u00BB'}</span>}
                    {p.name}
                  </td>
                  <td className="px-1 text-right text-green-300">{fmt(p.cash)}</td>
                  <td className="px-1 text-right text-blue-300">{playerPrivateValue[p.id] || '—'}</td>
                  <td className={`px-1 text-center ${certs > game.certLimit ? 'text-red-400 font-bold' : 'text-blue-300'}`}>
                    {certs}/{game.certLimit}
                  </td>
                  {corps.map(c => {
                    const pct = playerSharePercent(p, c.sym)
                    const pres = isPresident(p, c.sym)
                    const isSelected = activePlayer === p.id && activeCorp === c.sym
                    return (
                      <td key={c.sym}
                        className={`px-1 text-center cursor-pointer hover:bg-blue-800 ${isSelected ? 'bg-blue-700' : ''}`}
                        onClick={() => handleCellClick(p.id, c.sym)}>
                        {pct === 0
                          ? <span className="text-blue-900">·</span>
                          : <span className="text-white">{pres && <span className="text-yellow-400">{'\u00BB'}</span>}{pct}</span>
                        }
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {/* Separator */}
            <tr><td colSpan={4 + colCount} className="h-px bg-green-700"></td></tr>

            {/* Corp data rows */}
            <CRow label="Price" corps={corps} render={c => (
              <span className="text-cyan-300">{c.price || '—'}{c.pos && <span className="text-blue-500">/{c.pos.row}</span>}</span>
            )} />
            <CRow label="Par" corps={corps} render={c => (
              <span className="text-blue-300">{c.parPrice || '—'}</span>
            )} />
            <CRow label="Treas" corps={corps} render={c => (
              <span className={c.cash < 0 ? 'text-red-400' : 'text-green-300'}>{fmt(c.cash)}</span>
            )} />
            <CRow label="IPO" corps={corps} render={c => (
              <span className="text-blue-300">{c.ipoShares > 0 ? `${c.ipoShares}%` : '—'}</span>
            )} />
            <CRow label="Pool" corps={corps} render={c => (
              <span className={c.marketShares > 0 ? 'text-yellow-300' : 'text-blue-900'}>{c.marketShares > 0 ? `${c.marketShares}%` : '—'}</span>
            )} />
            <CRow label="Trains" corps={corps} click={handleTrainClick} render={c => {
              if (c.trains.length === 0) return <span className="text-red-500">none</span>
              return <span className="text-white font-bold">{c.trains.map(t => t.name).join('')}</span>
            }} />
            <CRow label="Rev" corps={corps} click={handleRevenueClick} render={c => {
              const rev = lastRevenue[c.sym]
              if (!rev) return <span className="text-blue-900">—</span>
              const sign = rev.type === 'WITHHOLD_DIVIDEND' ? '-' : rev.type === 'HALF_DIVIDEND' ? '~' : '+'
              return <span className={rev.type === 'WITHHOLD_DIVIDEND' ? 'text-red-300' : 'text-green-300'}>{sign}{rev.amount}</span>
            }} />
            <CRow label="Tokens" corps={corps} render={c => (
              <span className="text-blue-300">{c.tokensPlaced}/{c.tokens.length}</span>
            )} />
            <CRow label="Pres" corps={corps} render={c => {
              const pres = game.players.find(p => isPresident(p, c.sym))
              return <span className="text-yellow-400">{pres ? pres.name.slice(0, 5) : '—'}</span>
            }} />
          </tbody>
        </table>
      </div>

      {/* Train depot strip */}
      <div className="bg-blue-900 text-white px-2 py-1 flex items-center gap-1 flex-wrap flex-shrink-0">
        <span className="text-blue-400">Depot:</span>
        {depotGroups.map(g => (
          <span key={g.name} className="mr-1">
            <span className="text-green-300 font-bold">{String(g.name).repeat(Math.min(g.count, 12))}</span>
            <span className="text-yellow-300 ml-0.5">{fmt(g.price)}</span>
            {g.rustsOn && <span className="text-red-400 ml-0.5">r{g.rustsOn}</span>}
          </span>
        ))}
      </div>

      {/* Action panel — pops up at bottom when a cell is clicked */}
      {panel && (
        <ActionPanel
          panel={panel}
          game={game}
          activePlayer={activePlayer}
          activeCorp={activeCorp}
          corps={corps}
          unfloated={unfloated}
          dispatch={dispatch}
          fmt={fmt}
          revenueInput={revenueInput}
          setRevenueInput={setRevenueInput}
          onClose={closePanel}
        />
      )}
    </div>
  )
}

function CRow({ label, corps, render, click }) {
  return (
    <tr className="bg-blue-950 border-t border-blue-900/20">
      <td colSpan={4} className="px-1 py-0.5 text-green-600 sticky left-0 bg-blue-950 z-10">{label}</td>
      {corps.map(c => (
        <td key={c.sym}
          className={`px-1 text-center py-0.5 ${click ? 'cursor-pointer hover:bg-blue-800' : ''}`}
          onClick={click ? () => click(c.sym) : undefined}>
          {render(c)}
        </td>
      ))}
    </tr>
  )
}

function ActionPanel({ panel, game, activePlayer, activeCorp, corps, unfloated, dispatch, fmt, revenueInput, setRevenueInput, onClose }) {
  const corp = activeCorp ? game.corporations.find(c => c.sym === activeCorp) : null
  const player = activePlayer ? game.players.find(p => p.id === activePlayer) : null
  const price = activeCorp ? corpPrice(game.stockMarket, activeCorp) || 0 : 0

  function doAction(action) {
    dispatch(action)
    onClose()
  }

  return (
    <div className="bg-gray-900 border-t border-green-700 px-2 py-2 flex-shrink-0">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          {/* Share actions: buy from IPO/market, sell */}
          {panel === 'share' && player && corp && (
            <div className="flex flex-wrap gap-1">
              <span className="text-green-400 mr-1">{player.name} + {corp.sym}:</span>
              {corp.ipoShares > 0 && (
                <Btn label={`Buy IPO ${fmt(price * 1)}`} color="green"
                  onClick={() => doAction({ type: 'BUY_SHARE', playerId: player.id, corpSym: corp.sym, source: 'ipo', percent: 10 })} />
              )}
              {corp.marketShares > 0 && (
                <Btn label={`Buy Mkt ${fmt(price * 1)}`} color="cyan"
                  onClick={() => doAction({ type: 'BUY_SHARE', playerId: player.id, corpSym: corp.sym, source: 'market', percent: 10 })} />
              )}
              {playerSharePercent(player, corp.sym) > 0 && (
                <Btn label={`Sell 10%`} color="red"
                  onClick={() => doAction({ type: 'SELL_SHARES', playerId: player.id, corpSym: corp.sym, percent: 10 })} />
              )}
              {playerSharePercent(player, corp.sym) >= 20 && (
                <Btn label={`Sell 20%`} color="red"
                  onClick={() => doAction({ type: 'SELL_SHARES', playerId: player.id, corpSym: corp.sym, percent: 20 })} />
              )}
            </div>
          )}

          {/* Revenue/dividend actions */}
          {panel === 'revenue' && corp && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-green-400 mr-1">{corp.sym} Rev:</span>
              <input
                type="number"
                value={revenueInput}
                onChange={e => setRevenueInput(e.target.value)}
                placeholder="0"
                className="w-16 bg-black border border-green-800 rounded px-1 py-0.5 text-white text-center"
                autoFocus
                onKeyDown={e => {
                  const rev = parseInt(revenueInput, 10)
                  if (!rev || rev <= 0) return
                  if (e.key === 'p' || e.key === '+') doAction({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: rev })
                  if (e.key === 'w' || e.key === '-') doAction({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: rev })
                  if (e.key === 'h' || e.key === '~') doAction({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: rev })
                }}
              />
              {(() => {
                const rev = parseInt(revenueInput, 10) || 0
                if (rev <= 0) return null
                return (
                  <>
                    <Btn label={`Pay(p)`} color="green"
                      onClick={() => doAction({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: rev })} />
                    {game.title.halfPay && (
                      <Btn label={`Half(h)`} color="yellow"
                        onClick={() => doAction({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: rev })} />
                    )}
                    <Btn label={`W/hold(w)`} color="red"
                      onClick={() => doAction({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: rev })} />
                    <span className="text-blue-400 ml-1">{fmt(Math.floor(rev / 10))}/sh</span>
                  </>
                )
              })()}
            </div>
          )}

          {/* Train purchase */}
          {panel === 'train' && corp && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-green-400 mr-1">{corp.sym} Buy:</span>
              {nextAvailableTrains(game.depot).map(t => {
                const canAfford = corp.cash >= t.price
                return (
                  <Btn key={t.name}
                    label={`${t.name} ${fmt(t.price)}`}
                    color={canAfford ? 'green' : 'gray'}
                    onClick={() => canAfford && doAction({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName: t.name, price: t.price })} />
                )
              })}
              {/* Buy from other corps */}
              {game.corporations.filter(c => c.sym !== corp.sym && c.trains.length > 0).map(other => (
                other.trains.map(t => (
                  <Btn key={`${other.sym}-${t.id}`}
                    label={`${t.name} from ${other.sym}`}
                    color="cyan"
                    onClick={() => {
                      const p = prompt(`Price for ${t.name} from ${other.sym}?`)
                      const price = parseInt(p, 10)
                      if (price > 0) doAction({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName: t.name, price, fromCorpSym: other.sym })
                    }} />
                ))
              ))}
            </div>
          )}

          {/* Par new corporation */}
          {panel === 'par' && player && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-green-400 mr-1">{player.name} Par:</span>
              {unfloated.map(c => (
                <span key={c.sym} className="inline-flex items-center gap-0.5">
                  <span style={{ color: c.color }} className="font-bold">{c.sym}</span>
                  {parPrices(game.stockMarket).map(pp => {
                    const presPercent = game.title.shares?.[0] ?? 20
                    const cost = (pp.price * presPercent) / 10
                    const canAfford = player.cash >= cost
                    return (
                      <Btn key={`${c.sym}-${pp.price}`}
                        label={`${fmt(pp.price)}`}
                        color={canAfford ? 'green' : 'gray'}
                        onClick={() => canAfford && doAction({
                          type: 'PAR_SHARE', playerId: player.id, corpSym: c.sym,
                          parPrice: pp.price, row: pp.row, col: pp.col,
                        })} />
                    )
                  })}
                  <span className="text-blue-900 mx-1">|</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose} className="text-red-400 hover:text-red-200 px-1">Esc</button>
      </div>
    </div>
  )
}

function Btn({ label, color, onClick }) {
  const colors = {
    green: 'bg-green-900 text-green-300 hover:bg-green-800',
    red: 'bg-red-900 text-red-300 hover:bg-red-800',
    cyan: 'bg-cyan-900 text-cyan-300 hover:bg-cyan-800',
    yellow: 'bg-yellow-900 text-yellow-300 hover:bg-yellow-800',
    gray: 'bg-gray-800 text-gray-500 cursor-not-allowed',
  }
  return (
    <button onClick={onClick} className={`px-1.5 py-0.5 rounded text-xs font-mono ${colors[color] || colors.green}`}>
      {label}
    </button>
  )
}
