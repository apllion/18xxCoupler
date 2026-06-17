// Card 1: Player Switch + Overview — select player AND see all players' stats

import { useUIStore } from '../../../store/uiStore.js'

export default function PlayerSwitch({ data }) {
  const { game, fmt, myPlayerId, corps, playerSharePercent, playerCertCount, isPresident, corpPrice } = data

  return (
    <div className="flex flex-col h-full">
      <div className="text-lg font-bold mb-1">Players</div>
      <div className="text-xs text-broker-text-muted mb-3">Tap to set your perspective</div>

      <div className="space-y-2 flex-1">
        {game.players.map(p => {
          const isMe = p.id === myPlayerId
          const certs = playerCertCount(p)
          let shareValue = 0
          for (const s of p.shares) {
            const price = corpPrice(game.stockMarket, s.corpSym) || 0
            shareValue += price * (s.percent / 10)
          }

          return (
            <button key={p.id}
              onClick={() => useUIStore.getState().setMyPlayer(p.id)}
              className={`w-full text-left rounded-xl p-3 transition-colors ${
                isMe
                  ? 'bg-broker-gold/15 border-2 border-broker-gold'
                  : 'bg-broker-surface border border-broker-border hover:bg-broker-surface-hover'
              }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{p.name}</span>
                  {p.id === game.priorityDeal && <span className="text-[10px] text-broker-gold">PD</span>}
                  {isMe && <span className="text-[10px] text-broker-gold">★</span>}
                </div>
                <span className="text-sky-300 font-bold">{fmt(p.cash)}</span>
              </div>
              {/* Share badges */}
              <div className="flex gap-1 flex-wrap mb-1">
                {corps.map(c => {
                  const pct = playerSharePercent(p, c.sym)
                  if (pct === 0) return null
                  const pres = isPresident(p, c.sym)
                  return (
                    <span key={c.sym} className="text-[10px] px-1 rounded font-bold"
                      style={{ backgroundColor: c.color, color: c.textColor }}>
                      {c.sym} {pct}%{pres ? 'P' : ''}
                    </span>
                  )
                })}
              </div>
              <div className="flex items-center justify-between text-[10px] text-broker-text-muted">
                <span>Certs: {certs}</span>
                <span>Net: {fmt(p.cash + shareValue)}</span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="text-[10px] text-broker-text-muted text-center mt-3">Swipe → for actions</div>
    </div>
  )
}
