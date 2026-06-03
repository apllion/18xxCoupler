// Shared data hook for both overview skins.
// Computes all derived game state and provides action handlers.

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

export { playerSharePercent, playerCertCount, isPresident, corpPrice, parPrices, nextAvailableTrains }

export function useOverviewData() {
  const game = useGameStore((s) => s.game)
  const undo = useGameStore((s) => s.undo)
  const redo = useGameStore((s) => s.redo)
  const canUndo = useGameStore((s) => s.canUndo)
  const canRedo = useGameStore((s) => s.canRedo)
  const dispatch = useDispatch()

  const fullLog = useGameStore((s) => s.fullLog)
  const enterReplay = useGameStore((s) => s.enterReplay)
  const exitReplay = useGameStore((s) => s.exitReplay)
  const replayTo = useGameStore((s) => s.replayTo)
  const enterWhatIf = useGameStore((s) => s.enterWhatIf)
  const whatIfSnapshot = useGameStore((s) => s.whatIfSnapshot)
  const isWhatIf = !!whatIfSnapshot
  const inReplay = fullLog !== null

  const [curRow, setCurRow] = useState(0)
  const [curCol, setCurCol] = useState(0)
  const [panel, setPanel] = useState(null)
  const [revenueInput, setRevenueInput] = useState('')
  const [trainPrice, setTrainPrice] = useState('')
  const revRef = useRef(null)
  const rootRef = useRef(null)
  const cursorRef = useRef(null)

  const fmt = game ? (n) => formatCurrency(n, game.title.currencyFormat) : (n) => String(n)
  const phase = game ? currentPhase(game.phaseManager) : null
  const label = game?.roundTracker ? roundLabel(game.roundTracker) : ''
  const limit = game ? trainLimit(game.phaseManager) : 0

  const corps = useMemo(() => {
    if (!game) return []
    const active = game.corporations
      .filter(c => c.ipoed || c.floated)
      .map(c => ({ ...c, price: corpPrice(game.stockMarket, c.sym) || 0, pos: game.stockMarket.corpPositions[c.sym] }))
      .sort((a, b) => b.price - a.price)
    const inactive = game.corporations
      .filter(c => !c.ipoed && !c.floated)
      .map(c => ({ ...c, price: 0, pos: null }))
    return [...active, ...inactive]
  }, [game?.corporations, game?.stockMarket])

  const unfloated = useMemo(() =>
    game ? game.corporations.filter(c => !c.ipoed && !c.floated) : [],
    [game?.corporations]
  )

  const lastRevenue = useMemo(() => {
    if (!game) return {}
    const rev = {}
    for (let i = game.actionLog.length - 1; i >= 0; i--) {
      const a = game.actionLog[i].action
      if ((a.type === 'PAY_DIVIDEND' || a.type === 'WITHHOLD_DIVIDEND' || a.type === 'HALF_DIVIDEND') && !rev[a.corpSym]) {
        rev[a.corpSym] = { amount: a.totalRevenue, type: a.type }
      }
    }
    return rev
  }, [game?.actionLog])

  const corpPrivates = useMemo(() => {
    const map = {}
    for (const c of (game?.companies || [])) {
      if (c.ownerType === 'corporation' && c.ownerId && !c.closed) {
        if (!map[c.ownerId]) map[c.ownerId] = []
        map[c.ownerId].push(c.sym)
      }
    }
    return map
  }, [game?.companies])

  const playerPrivates = useMemo(() => {
    const map = {}
    for (const c of (game?.companies || [])) {
      if (c.ownerType === 'player' && c.ownerId && !c.closed) {
        if (!map[c.ownerId]) map[c.ownerId] = []
        map[c.ownerId].push(c)
      }
    }
    return map
  }, [game?.companies])

  const depotGroups = useMemo(() => {
    if (!game) return []
    const groups = []
    const seen = new Set()
    for (const t of game.depot.upcoming) {
      if (!seen.has(t.name)) {
        seen.add(t.name)
        groups.push({ name: t.name, price: t.price, count: remainingCount(game.depot, t.name), rustsOn: t.rustsOn })
      }
    }
    return groups
  }, [game?.depot])

  const lastAction = game?.actionLog?.length > 0 ? game.actionLog[game.actionLog.length - 1] : null
  const myPlayerId = useUIStore((s) => s.myPlayerId)
  const cursorPlayer = game?.players?.[curRow] || game?.players?.[0]
  // For share actions: use myPlayerId if set, otherwise cursor row
  const actingPlayer = myPlayerId ? game?.players?.find(p => p.id === myPlayerId) : cursorPlayer
  const selPlayer = actingPlayer || cursorPlayer
  const selCorp = corps[curCol] || corps[0]

  const rt = game?.roundTracker
  const isSR = rt?.type === 'stock' && !rt?.inPregame
  const isOR = rt?.type === 'operating' && !rt?.inPregame
  const isPre = rt?.inPregame

  function closePanel() { setPanel(null); setRevenueInput(''); setTrainPrice(''); rootRef.current?.focus() }
  function doAction(action) { dispatch(action); closePanel() }

  // Keyboard handler
  const onKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') closePanel(); return }
    const key = e.key
    if (key === 'ArrowUp') { e.preventDefault(); setCurRow(r => Math.max(0, r - 1)) }
    if (key === 'ArrowDown') { e.preventDefault(); setCurRow(r => Math.min((game?.players?.length || 1) - 1, r + 1)) }
    if (key === 'ArrowLeft') { e.preventDefault(); setCurCol(c => Math.max(0, c - 1)) }
    if (key === 'ArrowRight') { e.preventDefault(); setCurCol(c => Math.min(Math.max(corps.length - 1, 0), c + 1)) }
    // Number keys: navigate menu when open, player select otherwise
    if (key >= '0' && key <= '9' && panel === 'navigate') {
      e.preventDefault()
      const navMap = { '1': 'overview', '2': 'moderator', '3': 'market', '4': 'corps', '5': 'players', '6': 'privates', '7': 'beer', '0': 'summary' }
      if (navMap[key]) { useUIStore.getState().setActiveTab(navMap[key]); closePanel() }
      return
    }
    if (key >= '1' && key <= '9' && !panel) { const idx = parseInt(key) - 1; if (idx < (game?.players?.length || 0)) setCurRow(idx) }
    if (key === 'z' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (canUndo()) undo() }
    if (key === 'u' && !panel) { if (canUndo()) undo() }
    // Replay
    if (key === '[' || key === ',') { e.preventDefault(); if (inReplay) { replayTo(Math.max(-1, (game?.actionLog?.length || 0) - 2)) } else if (game?.actionLog?.length > 0) { enterReplay(); setTimeout(() => replayTo((game?.actionLog?.length || 1) - 2), 0) }; return }
    if (key === ']' || key === '.') { e.preventDefault(); if (inReplay) { const cur = (game?.actionLog?.length || 0) - 1; if (cur < fullLog.length - 1) replayTo(cur + 1) }; return }
    if (key === '{') { e.preventDefault(); if (!inReplay && game?.actionLog?.length > 0) enterReplay(); setTimeout(() => replayTo(-1), 0); return }
    if (key === '}') { e.preventDefault(); if (inReplay) replayTo(fullLog.length - 1); return }
    if (key === 'e' && !panel && inReplay) { exitReplay(); return }
    if (key === 'w' && !panel && inReplay) { exitReplay(); enterWhatIf(); return }
    if (key === 'Enter' && !panel && !inReplay && game?.actionLog?.length > 0) { enterReplay(); return }
    if (key === 'Escape') { if (panel) { closePanel(); return } if (inReplay) { exitReplay(); return } return }
    if (inReplay) return
    if (!selPlayer || !selCorp) return
    // Actions
    if (key === 'b' && !panel) { if (!selCorp.ipoed && !selCorp.floated) { setPanel('par'); return } if (selCorp.ipoShares > 0) doAction({ type: 'BUY_SHARE', playerId: selPlayer.id, corpSym: selCorp.sym, source: 'ipo', percent: 10 }); else if (selCorp.marketShares > 0) doAction({ type: 'BUY_SHARE', playerId: selPlayer.id, corpSym: selCorp.sym, source: 'market', percent: 10 }) }
    if (key === 'm' && !panel && selCorp.marketShares > 0) doAction({ type: 'BUY_SHARE', playerId: selPlayer.id, corpSym: selCorp.sym, source: 'market', percent: 10 })
    if (key === 's' && !panel && playerSharePercent(selPlayer, selCorp.sym) > 0) doAction({ type: 'SELL_SHARES', playerId: selPlayer.id, corpSym: selCorp.sym, percent: 10 })
    if (key === 'r' && !panel) { setPanel('revenue'); setTimeout(() => revRef.current?.focus(), 50) }
    if (key === 't' && !panel) setPanel('train')
    if (key === 'n' && !panel && unfloated.length > 0) setPanel('par')
    if (key === 'v' && !panel) setPanel('private')
    if (key === 'p' && !panel) setPanel('buyprivate')
    if (key === 'l' && !panel && game?.title?.loans && selCorp?.floated) setPanel('loan')
    if (key === 'g' && !panel && game?.title?.corpCanBuyShares && selCorp?.floated) setPanel('corpshare')
    if (key === 'a' && !panel) doAction({ type: 'ADVANCE_ROUND' })
    if (key === 'c' && !panel) doAction({ type: 'COLLECT_ALL_REVENUE' })
    if (key === 'o' && !panel) doAction({ type: 'SOLD_OUT_ADJUST' })
    if (key === 'i' && !panel && game?.title?.loans && selCorp?.floated) doAction({ type: 'PAY_INTEREST', corpSym: selCorp.sym })
    if (key === 'd' && !panel && selCorp) { setPanel('corpdetail') }
    if (key === 'f' && !panel) { setPanel('playerdetail') }
    // Tab opens navigate popup only in Moderator skin
    if (key === 'Tab' && useUIStore.getState().skin === 'moderator') { e.preventDefault(); setPanel('navigate') }
    if (key === 'x' && !panel) { setPanel('settings') }
    // F-keys for inline panels (Moderator only)
    if (useUIStore.getState().skin === 'moderator') {
      if (key === 'F1') { e.preventDefault(); closePanel() }
      if (key === 'F3') { e.preventDefault(); setPanel('corpdetail') }
      if (key === 'F4') { e.preventDefault(); setPanel('playerdetail') }
      if (key === 'F5') { e.preventDefault(); setPanel('buyprivate') }
      if (key === 'F6') { e.preventDefault(); setPanel('settings') }
    }
  }, [game, corps, selPlayer, selCorp, panel, canUndo, undo, canRedo, redo, unfloated, inReplay, fullLog])

  useEffect(() => { rootRef.current?.focus() }, [])
  useEffect(() => { cursorRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }, [curRow, curCol])

  return {
    game, fmt, phase, label, limit, corps, unfloated, depotGroups,
    lastRevenue, corpPrivates, playerPrivates, lastAction,
    selPlayer, cursorPlayer, myPlayerId, selCorp, curRow, setCurRow, curCol, setCurCol,
    panel, setPanel, revenueInput, setRevenueInput, trainPrice, setTrainPrice,
    revRef, rootRef, cursorRef, onKeyDown, closePanel, doAction,
    inReplay, fullLog, enterReplay, exitReplay, replayTo, enterWhatIf,
    isWhatIf, whatIfSnapshot, exitWhatIf: useGameStore.getState().exitWhatIf,
    canUndo, undo, canRedo, redo, dispatch,
    isSR, isOR, isPre, rt,
    superUmpire: useUIStore.getState().autoConfig?.superUmpire || false,
  }
}
