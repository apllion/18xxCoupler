// MobileShell — swipeable card-based player view for phones.
// Horizontal scroll-snap cards. One player at a time.

import { useState, useRef } from 'react' // useRef for SwipeArea
import { useGameData } from '../../hooks/useGameData.js'
import { useUIStore } from '../../store/uiStore.js'
import { useGameStore } from '../../store/gameStore.js'
import DriverPlayers from './driver-players.jsx'
import DriverSR from './driver-sr.jsx'
import DriverCorp from './driver-corp.jsx'
import DriverMarket from './driver-market.jsx'
import DriverPay from './driver-pay.jsx'
import DriverExtras from './driver-extras.jsx'

export default function MobileShell() {
  const baseData = useGameData()
  const [driverPlayerId, setDriverPlayerId] = useState(null)

  if (!baseData.game) return null

  // Mobile has its own player selection, independent of uiStore.myPlayerId
  const driverPlayer = baseData.game.players.find(p => p.id === driverPlayerId) || null
  const data = {
    ...baseData,
    myPlayerId: driverPlayerId,
    me: driverPlayer,
    setDriverPlayer: setDriverPlayerId,
  }

  const { game, corps } = data

  // All floated corps (player sees all, acts on their own)
  const floatedCorps = corps.filter(c => c.floated)

  const cardIds = [
    'players', 'sr',
    ...floatedCorps.map(c => c.sym),
    'market', 'pay', 'extras',
  ]
  const [cardIndex, setCardIndex] = useState(0)

  function prev() { setCardIndex(i => i <= 0 ? cardIds.length - 1 : i - 1) }
  function next() { setCardIndex(i => i >= cardIds.length - 1 ? 0 : i + 1) }

  function scrollTo(i) {
    const el = scrollRef.current?.children[i]
    el?.scrollIntoView({ behavior: 'smooth', inline: 'start' })
  }

  return (
    <div className="h-screen flex flex-col bg-broker-bg text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-broker-surface border-b border-broker-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{game.title.title}</span>
          <span className="text-[10px] text-broker-text-muted">Phase {data.phase?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {data.rt && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              data.isSR ? 'bg-green-800 text-green-200' : data.isOR ? 'bg-amber-800 text-amber-200' : 'bg-purple-800 text-purple-200'
            }`}>{data.rt.roundType}</span>
          )}
          {me && <span className="text-xs text-sky-300 font-bold">{data.fmt(me.cash)}</span>}
          <button onClick={() => { const s = useGameStore.getState(); if (s.canUndo()) s.undo() }}
            className="text-sm text-broker-text-muted hover:text-white px-1" title="Undo">↩</button>
          <button onClick={() => useUIStore.getState().setViewMode('umpire')}
            className="text-[10px] text-broker-text-muted hover:text-white px-1">Umpire</button>
        </div>
      </div>

      {/* Card display with swipe */}
      <SwipeArea onLeft={next} onRight={prev} className="flex-1 overflow-y-auto p-4">
        {cardIds[cardIndex] === 'players' && <DriverPlayers data={data} />}
        {cardIds[cardIndex] === 'sr' && <DriverSR data={data} />}
        {cardIds[cardIndex] === 'market' && <DriverMarket data={data} />}
        {cardIds[cardIndex] === 'pay' && <DriverPay data={data} />}
        {cardIds[cardIndex] === 'extras' && <DriverExtras data={data} />}
        {floatedCorps.some(c => c.sym === cardIds[cardIndex]) && (
          <DriverCorp data={data} corp={floatedCorps.find(c => c.sym === cardIds[cardIndex])} />
        )}
      </SwipeArea>

      {/* Dot indicators + arrows */}
      <div className="flex items-center justify-center gap-1 py-2 bg-broker-surface border-t border-broker-border flex-shrink-0">
        <button onClick={prev} className="text-broker-text-muted hover:text-white px-2 text-sm">◀</button>
        {cardIds.map((id, i) => (
          <button key={id} onClick={() => setCardIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === cardIndex ? 'bg-broker-gold' : 'bg-broker-text-muted/30 hover:bg-broker-text-muted'
            }`}
            title={id}
          />
        ))}
        <button onClick={next} className="text-broker-text-muted hover:text-white px-2 text-sm">▶</button>
      </div>
    </div>
  )
}

function SwipeArea({ onLeft, onRight, className, children }) {
  const startX = useRef(0)

  function handleTouchStart(e) {
    startX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    const diff = startX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) onLeft()   // swipe left → next
      else onRight()           // swipe right → prev
    }
  }

  return (
    <div className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      {children}
    </div>
  )
}
