// PositionMeter — net worth comparison bar for all players.
// Shows cash + share value + private value per player.
// Only visible when plusPlus is unlocked.

import { corpPrice } from '../../engine/stockMarket.js'
import { playerSharePercent } from '../../engine/player.js'
import { formatCurrency } from '../../utils/currency.js'

export function PositionMeter({ game }) {
  if (!game) return null
  const fmt = (n) => formatCurrency(n, game.title.currencyFormat)

  // Calculate net worth per player
  const positions = game.players.map(p => {
    let shareValue = 0
    for (const c of game.corporations) {
      if (!c.ipoed) continue
      const pct = playerSharePercent(p, c.sym)
      const price = corpPrice(game.stockMarket, c.sym) || 0
      shareValue += (price * pct) / 10
    }

    let privateValue = 0
    for (const sym of p.privates) {
      const co = (game.companies || []).find(c => c.sym === sym)
      if (co && !co.closed) privateValue += co.value || 0
    }

    const total = p.cash + shareValue + privateValue
    return { id: p.id, name: p.name, cash: p.cash, shareValue, privateValue, total }
  })

  // Sort by total descending
  const sorted = [...positions].sort((a, b) => b.total - a.total)
  const maxTotal = sorted[0]?.total || 1
  const avgTotal = positions.reduce((s, p) => s + p.total, 0) / (positions.length || 1)

  return (
    <div className="px-3 py-2 text-xs flex-shrink-0 bg-broker-surface border-t border-broker-border">
      <div className="text-broker-text-muted font-medium mb-1">Position</div>
      {sorted.map((p) => {
        const barWidth = Math.round((p.total / maxTotal) * 100)
        const ratio = avgTotal > 0 ? (p.total / avgTotal).toFixed(2) : '—'
        const leading = p.total === maxTotal
        return (
          <div key={p.id} className="flex items-center gap-2 mb-1">
            <span className={`w-20 truncate ${leading ? 'text-broker-gold font-bold' : 'text-broker-text'}`}>{p.name}</span>
            <div className="flex-1 h-4 bg-broker-bg rounded overflow-hidden relative">
              <div className="h-full rounded flex" style={{ width: barWidth + '%' }}>
                <div className="bg-green-700 h-full" style={{ width: p.cash > 0 ? Math.round((p.cash / p.total) * 100) + '%' : '0' }} title={`Cash: ${fmt(p.cash)}`} />
                <div className="bg-blue-700 h-full" style={{ width: p.shareValue > 0 ? Math.round((p.shareValue / p.total) * 100) + '%' : '0' }} title={`Shares: ${fmt(p.shareValue)}`} />
                <div className="bg-purple-700 h-full" style={{ width: p.privateValue > 0 ? Math.round((p.privateValue / p.total) * 100) + '%' : '0' }} title={`Privates: ${fmt(p.privateValue)}`} />
              </div>
            </div>
            <span className={`w-16 text-right font-medium ${leading ? 'text-white' : 'text-broker-text'}`}>{fmt(p.total)}</span>
            <span className="text-broker-text-muted w-10 text-right">{ratio}x</span>
          </div>
        )
      })}
      <div className="flex gap-3 mt-1 text-[10px] text-broker-text-muted">
        <span><span className="inline-block w-2 h-2 bg-green-700 rounded-sm mr-0.5" />Cash</span>
        <span><span className="inline-block w-2 h-2 bg-blue-700 rounded-sm mr-0.5" />Shares</span>
        <span><span className="inline-block w-2 h-2 bg-purple-700 rounded-sm mr-0.5" />Privates</span>
        <span className="ml-auto">Avg: {fmt(Math.round(avgTotal))}</span>
      </div>
    </div>
  )
}
