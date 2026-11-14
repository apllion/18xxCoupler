// KibitzerShell — phone-optimized read-only spectator view.
// Single scrollable page: standings, corps, action feed.

import { useGameData } from '../../hooks/useGameData.js'
import { useRoleStore } from '../../store/roleStore.js'
import { allNetWorths } from '../../engine/rules/netWorth.js'

export default function KibitzerShell() {
  const { game, fmt, phase, corps, isSR, isOR, rt } = useGameData()
  const reset = useRoleStore((s) => s.reset)

  if (!game) return null

  const standings = allNetWorths(game)
  const topTotal = standings[0]?.total ?? 0

  // Last 20 action log entries, newest first
  const recentActions = game.actionLog
    .slice(-20)
    .reverse()

  const roundLabel = rt?.roundType || '—'
  const phaseName = phase?.name || '—'
  const bankCash = game.bank?.cash ?? game.bankCash ?? 0

  return (
    <div className="min-h-screen bg-broker-bg text-broker-text">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-broker-surface border-b border-broker-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-sm truncate">{game.title.title}</span>
          <span className="text-[10px] bg-broker-gold/20 text-broker-gold px-1.5 py-0.5 rounded font-mono">
            {phaseName}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
            isSR ? 'bg-green-900/40 text-green-300' : isOR ? 'bg-amber-900/40 text-amber-300' : 'bg-broker-surface-hover text-broker-text-muted'
          }`}>
            {roundLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-broker-text-muted">Bank {fmt(bankCash)}</span>
          <button
            onClick={reset}
            className="text-[10px] text-broker-text-muted hover:text-red-300 px-2 py-1"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Standings */}
      <div className="px-3 py-2">
        <div className="text-[10px] text-broker-text-muted uppercase tracking-wider mb-1">Standings</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-broker-text-muted text-[10px]">
              <th className="text-left py-0.5 w-5">#</th>
              <th className="text-left py-0.5">Player</th>
              <th className="text-right py-0.5">Cash</th>
              <th className="text-right py-0.5">Shares</th>
              <th className="text-right py-0.5 font-bold">Net</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.playerId} className={`border-t border-broker-border/50 ${
                s.total === topTotal ? 'text-broker-gold' : ''
              }`}>
                <td className="py-1 text-broker-text-muted">{i + 1}</td>
                <td className="py-1 truncate max-w-[120px]">{s.name}</td>
                <td className="py-1 text-right font-mono">{fmt(s.cash)}</td>
                <td className="py-1 text-right font-mono">{fmt(s.shareValue)}</td>
                <td className="py-1 text-right font-mono font-bold">{fmt(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Corps */}
      {corps.length > 0 && (
        <div className="px-3 py-2 border-t border-broker-border">
          <div className="text-[10px] text-broker-text-muted uppercase tracking-wider mb-1">Corporations</div>
          <div className="space-y-1">
            {corps.filter(c => c.floated).map((c) => (
              <div key={c.sym} className="flex items-center gap-2 text-xs bg-broker-surface rounded px-2 py-1">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                  style={{ backgroundColor: c.color, color: c.textColor || '#fff' }}
                >
                  {c.sym.slice(0, 3)}
                </div>
                <span className="font-bold w-10 truncate">{c.sym}</span>
                <span className="font-mono text-broker-gold">{fmt(c.price)}</span>
                <span className="text-broker-text-muted font-mono">{fmt(c.treasury)}</span>
                <span className="text-broker-text-muted text-[10px] ml-auto truncate">
                  {(c.trains || []).map(t => t.name || t).join(', ') || '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Feed */}
      {recentActions.length > 0 && (
        <div className="px-3 py-2 border-t border-broker-border">
          <div className="text-[10px] text-broker-text-muted uppercase tracking-wider mb-1">Recent Actions</div>
          <div className="space-y-0.5">
            {recentActions.map((entry) => (
              <div key={entry.id} className="text-[11px] flex gap-2 py-0.5">
                <span className="text-broker-text-muted text-[9px] shrink-0 w-12 font-mono">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-broker-text">{entry.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
