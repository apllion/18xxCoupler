// Card 2: Players Overview — all players summary

export default function PlayersOverview({ data }) {
  const { game, fmt, myPlayerId, playerSharePercent, playerCertCount, isPresident, corps, corpPrice } = data

  return (
    <div className="flex flex-col h-full">
      <div className="text-lg font-bold mb-3">Players</div>

      <div className="space-y-3 flex-1">
        {game.players.map(p => {
          const isMe = p.id === myPlayerId
          const certs = playerCertCount(p)
          // Net worth estimate: cash + shares × price
          let shareValue = 0
          for (const s of p.shares) {
            const price = corpPrice(game.stockMarket, s.corpSym) || 0
            shareValue += price * (s.percent / 10)
          }
          const netWorth = p.cash + shareValue

          return (
            <div key={p.id} className={`rounded-xl p-3 ${
              isMe ? 'bg-broker-gold/10 border border-broker-gold/30' : 'bg-broker-surface border border-broker-border'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{p.name}</span>
                  {p.id === game.priorityDeal && <span className="text-[10px] text-broker-gold">PD</span>}
                  {isMe && <span className="text-[10px] text-broker-gold">★</span>}
                </div>
                <span className="text-sky-300 font-bold">{fmt(p.cash)}</span>
              </div>

              {/* Shares */}
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
                <span>Certs: {certs}/{typeof game.certLimit === 'number' ? game.certLimit : '?'}</span>
                <span>Net: {fmt(netWorth)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
