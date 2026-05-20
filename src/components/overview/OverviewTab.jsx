// OverviewTab — Lemmi-style interactive moderator.
// Keyboard-first: arrow keys navigate, letters trigger actions.
// Full game management from one screen.

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
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

  // Replay state
  const fullLog = useGameStore((s) => s.fullLog)
  const enterReplay = useGameStore((s) => s.enterReplay)
  const exitReplay = useGameStore((s) => s.exitReplay)
  const replayTo = useGameStore((s) => s.replayTo)
  const enterWhatIf = useGameStore((s) => s.enterWhatIf)
  const inReplay = fullLog !== null

  // Cursor position in the matrix
  const [curRow, setCurRow] = useState(0) // player index
  const [curCol, setCurCol] = useState(0) // corp index
  // Action panel
  const [panel, setPanel] = useState(null) // null|'share'|'revenue'|'train'|'par'|'private'|'round'
  const [revenueInput, setRevenueInput] = useState('')
  const [trainPrice, setTrainPrice] = useState('')
  const revRef = useRef(null)
  const rootRef = useRef(null)

  if (!game) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const phase = currentPhase(game.phaseManager)
  const label = game.roundTracker ? roundLabel(game.roundTracker) : ''
  const limit = trainLimit(game.phaseManager)

  // Show ALL corps — floated first sorted by price, then unfloated in definition order
  const corps = useMemo(() => {
    const active = game.corporations
      .filter(c => c.ipoed || c.floated)
      .map(c => ({ ...c, price: corpPrice(game.stockMarket, c.sym) || 0, pos: game.stockMarket.corpPositions[c.sym] }))
      .sort((a, b) => b.price - a.price)
    const inactive = game.corporations
      .filter(c => !c.ipoed && !c.floated)
      .map(c => ({ ...c, price: 0, pos: null }))
    return [...active, ...inactive]
  }, [game.corporations, game.stockMarket])

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

  const playerPrivates = useMemo(() => {
    const map = {}
    for (const c of (game.companies || [])) {
      if (c.ownerType === 'player' && c.ownerId && !c.closed) {
        if (!map[c.ownerId]) map[c.ownerId] = []
        map[c.ownerId].push(c)
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
        groups.push({ name: t.name, price: t.price, count: remainingCount(game.depot, t.name), rustsOn: t.rustsOn })
      }
    }
    return groups
  }, [game.depot])

  const lastAction = game.actionLog.length > 0 ? game.actionLog[game.actionLog.length - 1] : null

  // Current selections
  const selPlayer = game.players[curRow] || game.players[0]
  const selCorp = corps[curCol] || corps[0]

  function closePanel() { setPanel(null); setRevenueInput(''); setTrainPrice(''); rootRef.current?.focus() }

  function doAction(action) {
    dispatch(action)
    closePanel()
  }

  // Master keyboard handler
  const onKeyDown = useCallback((e) => {
    // Don't intercept input fields
    if (e.target.tagName === 'INPUT') {
      if (e.key === 'Escape') closePanel()
      return
    }

    const key = e.key

    // Navigation
    if (key === 'ArrowUp') { e.preventDefault(); setCurRow(r => Math.max(0, r - 1)) }
    if (key === 'ArrowDown') { e.preventDefault(); setCurRow(r => Math.min(game.players.length - 1, r + 1)) }
    if (key === 'ArrowLeft') { e.preventDefault(); setCurCol(c => Math.max(0, c - 1)) }
    if (key === 'ArrowRight') { e.preventDefault(); setCurCol(c => Math.min(Math.max(corps.length - 1, 0), c + 1)) }

    // Quick player select: 1-9
    if (key >= '1' && key <= '9') {
      const idx = parseInt(key) - 1
      if (idx < game.players.length) setCurRow(idx)
    }

    // Undo
    if (key === 'z' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (canUndo()) undo() }
    if (key === 'u' && !panel) { if (canUndo()) undo() }

    // Replay controls: [ ] step, Home/End jump, Enter=enter replay, E=exit, W=what-if
    if (key === '[' || key === ',') {
      e.preventDefault()
      if (inReplay) {
        const cur = game.actionLog.length - 1
        replayTo(Math.max(-1, cur - 1))
      } else if (game.actionLog.length > 0) {
        enterReplay()
        // Step back one from end
        setTimeout(() => replayTo(game.actionLog.length - 2), 0)
      }
      return
    }
    if (key === ']' || key === '.') {
      e.preventDefault()
      if (inReplay) {
        const cur = game.actionLog.length - 1
        if (cur < fullLog.length - 1) replayTo(cur + 1)
      }
      return
    }
    if (key === 'Home') {
      e.preventDefault()
      if (!inReplay && game.actionLog.length > 0) enterReplay()
      setTimeout(() => replayTo(-1), 0)
      return
    }
    if (key === 'End') {
      e.preventDefault()
      if (inReplay) { replayTo(fullLog.length - 1) }
      return
    }
    if (key === 'e' && !panel && inReplay) { exitReplay(); return }
    if (key === 'w' && !panel && inReplay) { exitReplay(); enterWhatIf(); return }
    if (key === 'Enter' && !panel && !inReplay && game.actionLog.length > 0) { enterReplay(); return }

    // Escape closes panel or exits replay
    if (key === 'Escape') {
      if (panel) { closePanel(); return }
      if (inReplay) { exitReplay(); return }
      return
    }

    // Actions on current selection (disabled during replay)
    if (inReplay) return
    if (!selPlayer || !selCorp) return

    // B = Buy share (IPO or market) — also works as par if corp unfloated
    if (key === 'b' && !panel) {
      if (!selCorp.ipoed && !selCorp.floated) {
        // Open par panel for this corp
        setPanel('par')
        return
      }
      if (selCorp.ipoShares > 0) {
        doAction({ type: 'BUY_SHARE', playerId: selPlayer.id, corpSym: selCorp.sym, source: 'ipo', percent: 10 })
      } else if (selCorp.marketShares > 0) {
        doAction({ type: 'BUY_SHARE', playerId: selPlayer.id, corpSym: selCorp.sym, source: 'market', percent: 10 })
      }
    }
    // M = Buy from market
    if (key === 'm' && !panel) {
      if (selCorp.marketShares > 0) {
        doAction({ type: 'BUY_SHARE', playerId: selPlayer.id, corpSym: selCorp.sym, source: 'market', percent: 10 })
      }
    }
    // S = Sell 10%
    if (key === 's' && !panel) {
      if (playerSharePercent(selPlayer, selCorp.sym) > 0) {
        doAction({ type: 'SELL_SHARES', playerId: selPlayer.id, corpSym: selCorp.sym, percent: 10 })
      }
    }
    // R = Revenue / dividend panel
    if (key === 'r' && !panel) {
      setPanel('revenue')
      setTimeout(() => revRef.current?.focus(), 50)
    }
    // T = Train purchase panel
    if (key === 't' && !panel) { setPanel('train') }
    // P = Par new corp panel
    if (key === 'n' && !panel && unfloated.length > 0) { setPanel('par') }
    // V = Sell private to corp
    if (key === 'v' && !panel) { setPanel('private') }
    // L = Take/repay loan (1817, 1867)
    if (key === 'l' && !panel && game.title.loans && selCorp?.floated) { setPanel('loan') }
    // A = Advance round
    if (key === 'a' && !panel) { doAction({ type: 'ADVANCE_ROUND' }) }
    // C = Collect all private revenue
    if (key === 'c' && !panel) { doAction({ type: 'COLLECT_ALL_REVENUE' }) }
    // O = Sold-out adjust
    if (key === 'o' && !panel) { doAction({ type: 'SOLD_OUT_ADJUST' }) }
    // I = Pay interest (1817, 1867)
    if (key === 'i' && !panel && game.title.loans && selCorp?.floated) {
      doAction({ type: 'PAY_INTEREST', corpSym: selCorp.sym })
    }
    // D = Drill into corp detail (for mergers, conversions, complex actions)
    if (key === 'd' && !panel && selCorp?.floated) {
      useUIStore.getState().setActiveCorp(selCorp.sym)
      useUIStore.getState().setActiveTab('corps')
    }
    // F = Drill into player detail
    if (key === 'f' && !panel) {
      useUIStore.getState().setActivePlayer(selPlayer.id)
      useUIStore.getState().setActiveTab('players')
    }
    // Tab = switch to last detail view
    if (key === 'Tab') { e.preventDefault(); useUIStore.getState().setActiveTab('market') }
  }, [game, corps, selPlayer, selCorp, panel, canUndo, undo, unfloated])

  useEffect(() => {
    const el = rootRef.current
    if (el) el.focus()
  }, [])

  return (
    <div ref={rootRef} tabIndex={0} onKeyDown={onKeyDown}
      className="font-mono text-xs leading-tight select-none h-full flex flex-col bg-blue-950 outline-none">

      {/* Title bar — color-coded by round type */}
      <TitleBar game={game} label={label} phase={phase} limit={limit} fmt={fmt}
        inReplay={inReplay} fullLog={fullLog} canUndo={canUndo} undo={undo} />

      {/* Main matrix */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-950 text-green-400">
              <th className="text-left px-1 py-0.5 sticky left-0 bg-blue-950 z-10 min-w-[80px]"></th>
              <th className="px-1 text-right min-w-[44px]">Cash</th>
              <th className="px-1 text-right min-w-[28px]">Prv</th>
              <th className="px-1 text-center min-w-[32px]">Cert</th>
              {corps.map((c, ci) => (
                <th key={c.sym}
                  className={`px-1 text-center min-w-[44px] cursor-pointer ${ci === curCol ? 'bg-blue-800' : 'hover:bg-blue-900'} ${!c.ipoed && !c.floated ? 'opacity-40' : ''}`}
                  style={{ color: c.color }}
                  onClick={() => setCurCol(ci)}>
                  {c.sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {game.players.map((p, pi) => {
              const isPriority = p.id === game.priorityDeal
              const certs = playerCertCount(p)
              const isRow = pi === curRow
              const privs = playerPrivates[p.id]
              return (
                <tr key={p.id} className={`border-t border-blue-900/40 ${isRow ? 'bg-blue-900/60' : 'bg-blue-950'}`}>
                  <td className={`px-1 py-0.5 sticky left-0 z-10 cursor-pointer ${isRow ? 'bg-blue-900/60' : 'bg-blue-950'} text-yellow-300`}
                    onClick={() => setCurRow(pi)}>
                    <span className="text-blue-500 mr-0.5">{pi + 1}</span>
                    {isPriority && <span className="text-white">{'\u00BB'}</span>}
                    {p.name}
                  </td>
                  <td className="px-1 text-right text-green-300">{fmt(p.cash)}</td>
                  <td className="px-1 text-right text-purple-300" title={privs?.map(c => c.sym).join(', ')}>
                    {privs ? privs.length : '—'}
                  </td>
                  <td className={`px-1 text-center ${certs > game.certLimit ? 'text-red-400 font-bold' : 'text-blue-300'}`}>
                    {certs}/{game.certLimit}
                  </td>
                  {corps.map((c, ci) => {
                    const pct = playerSharePercent(p, c.sym)
                    const pres = isPresident(p, c.sym)
                    const isCursor = pi === curRow && ci === curCol
                    return (
                      <td key={c.sym}
                        className={`px-1 text-center cursor-pointer ${
                          isCursor ? 'bg-green-900 ring-1 ring-green-500' : ci === curCol ? 'bg-blue-900/30' : 'hover:bg-blue-800/40'
                        }`}
                        onClick={() => { setCurRow(pi); setCurCol(ci) }}>
                        {pct === 0
                          ? <span className="text-blue-900/60">·</span>
                          : <span className="text-white">{pres && <span className="text-yellow-400">{'\u00BB'}</span>}{pct}</span>
                        }
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {/* Green separator bar */}
            <tr><td colSpan={4 + corps.length} className="h-0.5 bg-green-700"></td></tr>

            {/* Corp data rows */}
            <CRow label="Price" corps={corps} curCol={curCol} render={c => {
              if (!c.ipoed) return <span className="text-blue-900/30">—</span>
              return <span className="text-cyan-300">{c.price || '—'}{c.pos && <span className="text-blue-500">/{c.pos.row}</span>}</span>
            }} />
            <CRow label="Par" corps={corps} curCol={curCol} render={c => {
              if (!c.ipoed) return <span className="text-blue-900/30">—</span>
              return <span className="text-blue-300">{c.parPrice || '—'}</span>
            }} />
            <CRow label="Treas" corps={corps} curCol={curCol} render={c => {
              if (!c.ipoed) return <span className="text-blue-900/30">—</span>
              return <span className={c.cash < 0 ? 'text-red-400' : 'text-green-300'}>{fmt(c.cash)}</span>
            }} />
            <CRow label="IPO" corps={corps} curCol={curCol} render={c => (
              <span className="text-blue-300">{c.ipoShares < 100 ? `${c.ipoShares}%` : c.ipoed ? '—' : <span className="text-blue-900/30">100%</span>}</span>
            )} />
            <CRow label="Pool" corps={corps} curCol={curCol} render={c => (
              <span className={c.marketShares > 0 ? 'text-yellow-300' : 'text-blue-900/30'}>{c.marketShares > 0 ? `${c.marketShares}%` : '—'}</span>
            )} />
            <CRow label="Trains" corps={corps} curCol={curCol} render={c => {
              if (!c.floated) return <span className="text-blue-900/30">—</span>
              if (c.trains.length === 0) return <span className="text-red-500 font-bold">!</span>
              return <span className="text-white font-bold">{c.trains.map(t => t.name).join('')}</span>
            }} />
            <CRow label="Rev" corps={corps} curCol={curCol} render={c => {
              if (!c.floated) return <span className="text-blue-900/30">—</span>
              const rev = lastRevenue[c.sym]
              if (!rev) return <span className="text-blue-900/30">—</span>
              const sign = rev.type === 'WITHHOLD_DIVIDEND' ? '-' : rev.type === 'HALF_DIVIDEND' ? '~' : '+'
              return <span className={rev.type === 'WITHHOLD_DIVIDEND' ? 'text-red-300' : 'text-green-300'}>{sign}{rev.amount}</span>
            }} />
            <CRow label="Tokens" corps={corps} curCol={curCol} render={c => {
              if (!c.floated) return <span className="text-blue-900/30">—</span>
              return <span className="text-blue-300">{c.tokensPlaced}/{c.tokens.length}</span>
            }} />
            <CRow label="Priv" corps={corps} curCol={curCol} render={c => {
              const privs = corpPrivates[c.sym]
              if (!privs) return <span className="text-blue-900/30">—</span>
              return <span className="text-purple-300">{privs.join(',')}</span>
            }} />
            <CRow label="Pres" corps={corps} curCol={curCol} render={c => {
              if (!c.ipoed) return <span className="text-blue-900/30">—</span>
              const pres = game.players.find(p => isPresident(p, c.sym))
              return <span className="text-yellow-400">{pres ? pres.name.slice(0, 6) : '—'}</span>
            }} />

            {/* Conditional rows for title-specific mechanics */}

            {/* Loans (1817, 1867) */}
            {game.title.loans && (
              <CRow label="Loans" corps={corps} curCol={curCol} render={c => {
                if (!c.floated) return <span className="text-blue-900/30">—</span>
                if (!c.loans) return <span className="text-blue-900/30">0</span>
                return <span className="text-red-300 font-bold">{c.loans}</span>
              }} />
            )}

            {/* Corp size (1817) */}
            {game.title.corpSizing?.enabled && (
              <CRow label="Size" corps={corps} curCol={curCol} render={c => {
                if (!c.ipoed) return <span className="text-blue-900/30">—</span>
                return <span className="text-cyan-300">{c.corpSize || '2sh'}</span>
              }} />
            )}

            {/* Corp type (1861, 1867, 1822, etc.) */}
            {corps.some(c => c.type && c.type !== 'major') && (
              <CRow label="Type" corps={corps} curCol={curCol} render={c => {
                if (!c.type || c.type === 'major') return <span className="text-blue-900/30">—</span>
                const colors = { minor: 'text-cyan-400', national: 'text-red-300', brewery: 'text-amber-300', metal: 'text-gray-300', branch: 'text-green-400' }
                return <span className={colors[c.type] || 'text-blue-300'}>{c.type}</span>
              }} />
            )}

            {/* Shares held by corps (21Moon, PTG, 18India) */}
            {game.title.corpCanBuyShares && (
              <CRow label="Holds" corps={corps} curCol={curCol} render={c => {
                if (!c.sharesHeld || c.sharesHeld.length === 0) return <span className="text-blue-900/30">—</span>
                const summary = {}
                for (const s of c.sharesHeld) { summary[s.corpSym] = (summary[s.corpSym] || 0) + s.percent }
                return <span className="text-cyan-300">{Object.entries(summary).map(([k, v]) => `${k}${v}%`).join(' ')}</span>
              }} />
            )}
          </tbody>
        </table>
      </div>

      {/* Train depot strip */}
      <div className="bg-blue-900 text-white px-2 py-0.5 flex items-center gap-1 flex-wrap flex-shrink-0">
        <span className="text-blue-400">Depot:</span>
        {depotGroups.map(g => (
          <span key={g.name}>
            <span className="text-green-300 font-bold">{String(g.name).repeat(Math.min(g.count, 12))}</span>
            <span className="text-yellow-300 ml-0.5">{fmt(g.price)}</span>
            {g.rustsOn && <span className="text-red-400 ml-0.5">r{g.rustsOn}</span>}
            <span className="text-blue-800 mx-0.5">|</span>
          </span>
        ))}
      </div>

      {/* Action panel */}
      {panel ? (
        <ActionPanel
          panel={panel} game={game} player={selPlayer} corp={selCorp}
          corps={corps} unfloated={unfloated} dispatch={dispatch} fmt={fmt}
          revenueInput={revenueInput} setRevenueInput={setRevenueInput}
          trainPrice={trainPrice} setTrainPrice={setTrainPrice}
          revRef={revRef} onClose={closePanel} doAction={doAction}
        />
      ) : (
        <BottomBar game={game} inReplay={inReplay} fullLog={fullLog} lastAction={lastAction}
          selPlayer={selPlayer} selCorp={selCorp} dispatch={dispatch}
          enterReplay={enterReplay} exitReplay={exitReplay} replayTo={replayTo} enterWhatIf={enterWhatIf}
          setPanel={setPanel} doAction={doAction} revRef={revRef} rootRef={rootRef}
          unfloated={unfloated} canUndo={canUndo} undo={undo} />
      )}
    </div>
  )
}

function BottomBar({ game, inReplay, fullLog, lastAction, selPlayer, selCorp, dispatch,
  enterReplay, exitReplay, replayTo, enterWhatIf, setPanel, doAction, revRef, rootRef,
  unfloated, canUndo, undo }) {

  const isSR = game.roundTracker?.type === 'stock' && !game.roundTracker?.inPregame
  const curIdx = game.actionLog.length - 1

  if (inReplay) {
    return (
      <div className="bg-gray-900 border-t border-purple-800 px-1 py-1 flex-shrink-0">
        <div className="flex items-center gap-1 flex-wrap">
          <Btn l="Prev" c="cyan" o={() => replayTo(Math.max(-1, curIdx - 1))} />
          <Btn l="Next" c="cyan" o={() => curIdx < fullLog.length - 1 && replayTo(curIdx + 1)} />
          <Btn l="Start" c="gray" o={() => replayTo(-1)} />
          <Btn l="End" c="gray" o={() => replayTo(fullLog.length - 1)} />
          <Btn l="What-if" c="purple" o={() => { exitReplay(); enterWhatIf() }} />
          <Btn l="Exit" c="red" o={() => exitReplay()} />
          <span className="text-blue-400 text-xs truncate ml-1 flex-1">
            {curIdx < 0 ? 'Game start' : `${curIdx + 1}/${fullLog.length}: ${lastAction?.description || ''}`}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border-t border-green-800 px-1 py-1 flex-shrink-0">
      <div className="flex items-center gap-1 flex-wrap">
        {/* Share actions */}
        <Btn l="Buy" c="green" o={() => {
          if (!selCorp) return
          if (!selCorp.ipoed && !selCorp.floated) { setPanel('par'); return }
          if (selCorp.ipoShares > 0) doAction({ type: 'BUY_SHARE', playerId: selPlayer?.id, corpSym: selCorp.sym, source: 'ipo', percent: 10 })
          else if (selCorp.marketShares > 0) doAction({ type: 'BUY_SHARE', playerId: selPlayer?.id, corpSym: selCorp.sym, source: 'market', percent: 10 })
        }} />
        <Btn l="Sell" c="red" o={() => {
          if (selPlayer && selCorp && playerSharePercent(selPlayer, selCorp.sym) > 0)
            doAction({ type: 'SELL_SHARES', playerId: selPlayer.id, corpSym: selCorp.sym, percent: 10 })
        }} />
        <Btn l="Mkt" c="cyan" o={() => {
          if (selPlayer && selCorp?.marketShares > 0)
            doAction({ type: 'BUY_SHARE', playerId: selPlayer.id, corpSym: selCorp.sym, source: 'market', percent: 10 })
        }} />

        {/* Corp actions */}
        <Btn l="Rev" c="yellow" o={() => { setPanel('revenue'); setTimeout(() => revRef.current?.focus(), 50) }} />
        <Btn l="Train" c="green" o={() => setPanel('train')} />
        {unfloated.length > 0 && <Btn l="New" c="cyan" o={() => setPanel('par')} />}
        <Btn l="Priv" c="purple" o={() => setPanel('private')} />
        {game.title.loans && selCorp?.floated && <Btn l="Loan" c="yellow" o={() => setPanel('loan')} />}

        {/* Round management */}
        <span className="text-blue-800 mx-0.5">|</span>
        <Btn l="Adv" c="gray" o={() => doAction({ type: 'ADVANCE_ROUND' })} />
        <Btn l="Coll" c="gray" o={() => doAction({ type: 'COLLECT_ALL_REVENUE' })} />
        <Btn l="Sold" c="gray" o={() => doAction({ type: 'SOLD_OUT_ADJUST' })} />
        <Btn l="Undo" c="gray" o={() => canUndo() && undo()} />

        {/* Navigation */}
        <span className="text-blue-800 mx-0.5">|</span>
        {selCorp?.floated && <Btn l="Corp" c="gray" o={() => {
          useUIStore.getState().setActiveCorp(selCorp.sym)
          useUIStore.getState().setActiveTab('corps')
        }} />}
        <Btn l="Player" c="gray" o={() => {
          useUIStore.getState().setActivePlayer(selPlayer?.id)
          useUIStore.getState().setActiveTab('players')
        }} />
        {game.actionLog.length > 0 && <Btn l="Replay" c="purple" o={() => enterReplay()} />}

        {/* Status */}
        <span className="text-blue-400 text-xs truncate ml-1 flex-1">
          {lastAction?.description || ''}
        </span>
      </div>
    </div>
  )
}

function TitleBar({ game, label, phase, limit, fmt, inReplay, fullLog, canUndo, undo }) {
  const rt = game.roundTracker
  const isSR = rt?.type === 'stock' && !rt?.inPregame
  const isOR = rt?.type === 'operating' && !rt?.inPregame
  const isPre = rt?.inPregame
  const barBg = isSR ? 'bg-green-900' : isOR ? 'bg-amber-900' : isPre ? 'bg-purple-900' : 'bg-blue-900'
  const labelColor = isSR ? 'text-green-300 font-bold' : isOR ? 'text-amber-300 font-bold' : isPre ? 'text-purple-300' : 'text-blue-300'
  const roundDesc = isSR ? 'Stock Round' : isOR ? 'Operating Round' : isPre ? (rt.pregameSteps?.[rt.pregameIndex]?.label || 'Setup') : ''

  return (
    <div className={`${barBg} text-blue-200 px-2 py-1 flex justify-between flex-shrink-0`}>
      <span>
        <span className="text-white font-bold">{game.title.title}</span>
        <span className={`ml-2 ${labelColor}`}>{label}</span>
        <span className="text-cyan-300 ml-2">Ph.{phase.name}</span>
        <span className="text-blue-400 ml-2">Lim:{limit}</span>
        {roundDesc && <span className={`ml-2 ${labelColor}`}>{roundDesc}</span>}
      </span>
      <span className="flex items-center gap-2">
        {inReplay && (
          <span className="text-purple-300 font-bold">
            REPLAY {game.actionLog.length}/{fullLog.length}
          </span>
        )}
        <span className={game.bank.cash <= 0 ? 'text-red-400 font-bold' : 'text-green-300'}>Bank:{fmt(game.bank.cash)}</span>
        <button onClick={() => canUndo() && undo()} className="text-blue-400 hover:text-white">[U]ndo</button>
        <button onClick={() => useUIStore.getState().setActiveTab('market')}
          className="text-yellow-400 hover:text-yellow-200">[Tab] Detail</button>
      </span>
    </div>
  )
}

function CRow({ label, corps, curCol, render }) {
  return (
    <tr className="bg-blue-950 border-t border-blue-900/20">
      <td colSpan={4} className="px-1 py-px text-green-600 sticky left-0 bg-blue-950 z-10">{label}</td>
      {corps.map((c, ci) => (
        <td key={c.sym} className={`px-1 text-center py-px ${ci === curCol ? 'bg-blue-900/30' : ''}`}>
          {render(c)}
        </td>
      ))}
    </tr>
  )
}

function ActionPanel({ panel, game, player, corp, corps, unfloated, dispatch, fmt, revenueInput, setRevenueInput, trainPrice, setTrainPrice, revRef, onClose, doAction }) {
  const price = corp ? corpPrice(game.stockMarket, corp.sym) || 0 : 0

  return (
    <div className="bg-gray-900 border-t border-green-700 px-2 py-1.5 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex flex-wrap items-center gap-1">

          {/* Share actions */}
          {panel === 'share' && player && corp && (() => {
            const pct = playerSharePercent(player, corp.sym)
            return <>
              <span className="text-green-400">{player.name}+{corp.sym}:</span>
              {corp.ipoShares > 0 && <Btn l={`IPO ${fmt(price)}`} c="green" k="b" o={() => doAction({ type: 'BUY_SHARE', playerId: player.id, corpSym: corp.sym, source: 'ipo', percent: 10 })} />}
              {corp.marketShares > 0 && <Btn l={`Mkt ${fmt(price)}`} c="cyan" k="m" o={() => doAction({ type: 'BUY_SHARE', playerId: player.id, corpSym: corp.sym, source: 'market', percent: 10 })} />}
              {pct >= 10 && <Btn l="Sell 10%" c="red" k="s" o={() => doAction({ type: 'SELL_SHARES', playerId: player.id, corpSym: corp.sym, percent: 10 })} />}
              {pct >= 20 && <Btn l="Sell 20%" c="red" o={() => doAction({ type: 'SELL_SHARES', playerId: player.id, corpSym: corp.sym, percent: 20 })} />}
              {pct >= 30 && <Btn l="Sell 30%" c="red" o={() => doAction({ type: 'SELL_SHARES', playerId: player.id, corpSym: corp.sym, percent: 30 })} />}
            </>
          })()}

          {/* Revenue */}
          {panel === 'revenue' && corp && (
            <>
              <span className="text-green-400">{corp.sym} Rev:</span>
              <input ref={revRef} type="number" value={revenueInput} onChange={e => setRevenueInput(e.target.value)}
                placeholder="0" autoFocus
                className="w-16 bg-black border border-green-800 rounded px-1 py-0.5 text-white text-center"
                onKeyDown={e => {
                  const rev = parseInt(revenueInput, 10)
                  if (!rev || rev <= 0) return
                  if (e.key === 'p' || e.key === 'Enter') { e.preventDefault(); doAction({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }) }
                  if (e.key === 'w') { e.preventDefault(); doAction({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }) }
                  if (e.key === 'h') { e.preventDefault(); doAction({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: rev }) }
                }}
              />
              {parseInt(revenueInput, 10) > 0 && <>
                <Btn l="[P]ay" c="green" o={() => doAction({ type: 'PAY_DIVIDEND', corpSym: corp.sym, totalRevenue: parseInt(revenueInput) })} />
                {game.title.halfPay && <Btn l="[H]alf" c="yellow" o={() => doAction({ type: 'HALF_DIVIDEND', corpSym: corp.sym, totalRevenue: parseInt(revenueInput) })} />}
                <Btn l="[W]hold" c="red" o={() => doAction({ type: 'WITHHOLD_DIVIDEND', corpSym: corp.sym, totalRevenue: parseInt(revenueInput) })} />
                <span className="text-blue-400">{fmt(Math.floor(parseInt(revenueInput) / 10))}/sh</span>
                {price > 0 && Math.floor(parseInt(revenueInput) / 10) >= price && <span className="text-yellow-400 font-bold">x2!</span>}
              </>}
            </>
          )}

          {/* Train purchase */}
          {panel === 'train' && corp && (
            <>
              <span className="text-green-400">{corp.sym} train ({fmt(corp.cash)}):</span>
              {nextAvailableTrains(game.depot).map((t, i) => {
                const ok = corp.cash >= t.price
                return <Btn key={t.name} l={`${i + 1}:${t.name} ${fmt(t.price)}${t.rustsOn ? ' r' + t.rustsOn : ''}`}
                  c={ok ? 'green' : 'gray'} k={String(i + 1)}
                  o={() => ok && doAction({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName: t.name, price: t.price })} />
              })}
              {game.corporations.filter(c => c.sym !== corp.sym && c.trains.length > 0).map(other =>
                other.trains.map(t => (
                  <Btn key={`${other.sym}-${t.id}`} l={`${t.name}<${other.sym}`} c="cyan"
                    o={() => {
                      const p = prompt(`Price for ${t.name} from ${other.sym}?`)
                      const pr = parseInt(p, 10)
                      if (pr > 0) doAction({ type: 'BUY_TRAIN', corpSym: corp.sym, trainName: t.name, price: pr, fromCorpSym: other.sym })
                    }} />
                ))
              )}
            </>
          )}

          {/* Par new corp */}
          {panel === 'par' && player && (
            <>
              <span className="text-green-400">{player.name} par ({fmt(player.cash)}):</span>
              {unfloated.map(c => (
                <span key={c.sym} className="inline-flex items-center gap-0.5 mr-1">
                  <span style={{ color: c.color }} className="font-bold">{c.sym}</span>
                  {parPrices(game.stockMarket).slice(0, 8).map(pp => {
                    const presPercent = game.title.shares?.[0] ?? 20
                    const cost = (pp.price * presPercent) / 10
                    const ok = player.cash >= cost
                    return <Btn key={`${c.sym}-${pp.price}`} l={`${pp.price}`}
                      c={ok ? 'green' : 'gray'}
                      o={() => ok && doAction({ type: 'PAR_SHARE', playerId: player.id, corpSym: c.sym, parPrice: pp.price, row: pp.row, col: pp.col })} />
                  })}
                </span>
              ))}
            </>
          )}

          {/* Loan actions (1817, 1867) */}
          {panel === 'loan' && corp && (() => {
            const config = game.title.loans || {}
            const loanValue = config.loanValue || 100
            const loans = corp.loans || 0
            const max = config.maxLoansPerCorp || 99
            return <>
              <span className="text-green-400">{corp.sym} Loans: {loans}/{max} ({fmt(loanValue)}/loan):</span>
              {loans < max && <Btn l={`Take +${fmt(loanValue)}`} c="green" o={() => doAction({ type: 'TAKE_LOAN', corpSym: corp.sym })} />}
              {loans > 0 && corp.cash >= loanValue && <Btn l={`Repay -${fmt(loanValue)}`} c="red" o={() => doAction({ type: 'REPAY_LOAN', corpSym: corp.sym })} />}
              {loans > 0 && <Btn l="Pay Interest" c="yellow" o={() => doAction({ type: 'PAY_INTEREST', corpSym: corp.sym })} />}
            </>
          })()}

          {/* Sell private to corp */}
          {panel === 'private' && player && corp && (() => {
            const privs = (game.companies || []).filter(c => c.ownerType === 'player' && c.ownerId === player.id && !c.closed && c.canSellToCorp !== false)
            if (privs.length === 0) return <span className="text-red-400">No privates to sell</span>
            return <>
              <span className="text-green-400">{player.name} sell priv to {corp.sym}:</span>
              {privs.map(c => (
                <Btn key={c.sym} l={`${c.sym} (${fmt(c.value)})`} c="purple"
                  o={() => {
                    const p = prompt(`Sell ${c.sym} to ${corp.sym} for? (face: ${c.value})`)
                    const pr = parseInt(p, 10)
                    if (pr > 0) doAction({ type: 'SELL_PRIVATE', companySym: c.sym, fromPlayerId: player.id, toCorpSym: corp.sym, price: pr })
                  }} />
              ))}
            </>
          })()}
        </div>

        <button onClick={onClose} className="text-red-400 hover:text-red-200 font-bold">[Esc]</button>
      </div>
    </div>
  )
}

function Btn({ l, c, k, o }) {
  const colors = {
    green: 'bg-green-900/80 text-green-300 hover:bg-green-800',
    red: 'bg-red-900/80 text-red-300 hover:bg-red-800',
    cyan: 'bg-cyan-900/80 text-cyan-300 hover:bg-cyan-800',
    yellow: 'bg-yellow-900/80 text-yellow-300 hover:bg-yellow-800',
    purple: 'bg-purple-900/80 text-purple-300 hover:bg-purple-800',
    gray: 'bg-gray-800/60 text-gray-600 cursor-not-allowed',
  }
  return (
    <button onClick={o} className={`px-1.5 py-0.5 rounded text-xs font-mono ${colors[c] || colors.green}`}>
      {l}
    </button>
  )
}
