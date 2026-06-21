// Market Card — stock market grid + share distribution

export default function MarketCard({ data }) {
  const { game, fmt, corps, playerSharePercent, isPresident } = data

  return (
    <div className="flex flex-col h-full">
      <div className="text-lg font-bold mb-3">Market</div>

      {/* Corp prices — sorted by price desc */}
      <div className="space-y-2 mb-4">
        {corps.map(c => {
          const soldOut = c.ipoed && c.ipoShares === 0 && c.marketShares === 0
          return (
            <div key={c.sym} className="bg-broker-surface rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded font-bold text-sm"
                    style={{ backgroundColor: c.color, color: c.textColor }}>{c.sym}</span>
                  {soldOut && <span className="text-[10px] text-green-400">▲ sold out</span>}
                  {c.operated && <span className="text-[10px] text-green-400">✓</span>}
                </div>
                <span className="text-white font-bold text-lg">{fmt(c.price)}</span>
              </div>

              {/* Share distribution */}
              <div className="flex gap-1 flex-wrap text-[10px]">
                {game.players.map(p => {
                  const pct = playerSharePercent(p, c.sym)
                  if (pct === 0) return null
                  const pres = isPresident(p, c.sym)
                  return (
                    <span key={p.id} className={`px-1 rounded ${pres ? 'bg-yellow-800 text-yellow-200' : 'bg-broker-surface-hover text-broker-text'}`}>
                      {p.name.slice(0, 4)} {pct}%{pres ? 'P' : ''}
                    </span>
                  )
                })}
                {c.ipoShares > 0 && <span className="px-1 rounded bg-broker-surface-hover text-broker-text-muted">IPO {c.ipoShares}%</span>}
                {c.marketShares > 0 && <span className="px-1 rounded bg-amber-900 text-amber-300">Pool {c.marketShares}%</span>}
              </div>

              {/* Trains + Treasury */}
              <div className="flex items-center justify-between mt-1 text-xs text-broker-text-muted">
                <span>Treasury: <span className="text-sky-300">{fmt(c.cash)}</span></span>
                <span>{c.trains.length > 0 ? c.trains.map(t => t.name).join(' ') : 'no trains'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bank */}
      <div className="bg-broker-surface rounded-lg p-3 text-center">
        <div className="text-xs text-broker-text-muted">Bank</div>
        <div className={`text-xl font-bold ${game.bank.cash <= 0 ? 'text-red-400' : 'text-sky-300'}`}>
          {fmt(game.bank.cash)}
        </div>
      </div>
    </div>
  )
}
