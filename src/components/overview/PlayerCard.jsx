// PlayerCard — compact player detail card.
// Shows everything about one player in a dense, readable card.

import { corpPrice } from '../../engine/stockMarket.js'
import { playerSharePercent, playerCertCount, isPresident } from '../../engine/player.js'
import { formatCurrency } from '../../utils/currency.js'

export function PlayerCard({ game, playerId }) {
  const player = game.players.find(p => p.id === playerId)
  if (!player) return null

  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)
  const isPriority = player.id === game.priorityDeal
  const certs = playerCertCount(player)

  // Share holdings grouped by corp with value
  const holdings = game.corporations
    .filter(c => c.ipoed || c.floated)
    .map(c => {
      const pct = playerSharePercent(player, c.sym)
      if (pct === 0) return null
      const price = corpPrice(game.stockMarket, c.sym) || 0
      const value = (price * pct) / 10
      const pres = isPresident(player, c.sym)
      return { sym: c.sym, color: c.color, pct, value, price, pres }
    })
    .filter(Boolean)
    .sort((a, b) => b.value - a.value)

  const shareValue = holdings.reduce((s, h) => s + h.value, 0)

  // Privates
  const privates = (game.companies || []).filter(c => c.ownerType === 'player' && c.ownerId === playerId && !c.closed)
  const privateValue = privates.reduce((s, c) => s + (c.value || 0), 0)
  const privateRevenue = privates.reduce((s, c) => s + (c.revenue || 0), 0)

  const netWorth = player.cash + shareValue + privateValue

  return (
    <div className="bg-broker-surface rounded-lg p-3 text-sm">
      <div className="flex justify-between items-center mb-2">
        <span className={`font-bold text-lg ${isPriority ? 'text-broker-gold' : 'text-white'}`}>
          {player.name}{isPriority && ' (Priority)'}
        </span>
        <span className="text-white font-bold text-lg">{fmt(netWorth)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
        <div className="bg-broker-bg rounded px-2 py-1.5">
          <div className="text-broker-text-muted">Cash</div>
          <div className="text-white font-medium">{fmt(player.cash)}</div>
        </div>
        <div className="bg-broker-bg rounded px-2 py-1.5">
          <div className="text-broker-text-muted">Shares</div>
          <div className="text-white font-medium">{fmt(shareValue)}</div>
        </div>
        <div className="bg-broker-bg rounded px-2 py-1.5">
          <div className="text-broker-text-muted">Certs</div>
          <div className={`font-medium ${certs > game.certLimit ? 'text-red-400' : 'text-white'}`}>{certs}/{game.certLimit}</div>
        </div>
      </div>
      {/* Holdings */}
      {holdings.length > 0 && (
        <div className="space-y-1">
          {holdings.map(h => (
            <div key={h.sym} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }} />
                <span className="font-bold" style={{ color: h.color }}>{h.sym}</span>
                <span className="text-broker-text">{h.pct}%{h.pres && ' (P)'}</span>
              </div>
              <div className="text-broker-text-muted">
                @ {fmt(h.price)} = <span className="text-white">{fmt(h.value)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Privates */}
      {privates.length > 0 && (
        <div className="mt-2 flex gap-2 flex-wrap text-xs">
          {privates.map(c => (
            <span key={c.sym} className="bg-broker-bg px-2 py-1 rounded">
              <span className="text-white font-medium">{c.sym}</span>
              <span className="text-broker-text-muted ml-1">{fmt(c.value)}</span>
              {c.revenue > 0 && <span className="text-green-400 ml-1">+{fmt(c.revenue)}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
