import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'

const ZONE_COLORS = {
  yellow: 'bg-yellow-900/40 text-yellow-300',
  orange: 'bg-orange-900/40 text-orange-300',
  brown: 'bg-red-900/40 text-red-400',
  close: 'bg-broker-bg text-broker-gold-dim',
  endgame: 'bg-broker-green/40 text-broker-gold',
  initial: 'bg-purple-900/40 text-purple-300',
  reserved: 'bg-green-900/40 text-green-300',
  bonus: 'bg-cyan-900/40 text-cyan-300',
  normal: 'bg-broker-surface text-broker-text',
}

export default function MarketGrid({ movingCorp, onCellClick, onReorder }) {
  const game = useGameStore((s) => s.game)
  if (!game) return null

  const { grid, corpPositions } = game.stockMarket

  // Build a map of which corps are at which position, sorted by order
  const corpsAt = {}
  for (const [sym, pos] of Object.entries(corpPositions)) {
    const key = `${pos.row},${pos.col}`
    if (!corpsAt[key]) corpsAt[key] = []
    corpsAt[key].push({ sym, order: pos.order ?? 0 })
  }
  for (const key of Object.keys(corpsAt)) {
    corpsAt[key].sort((a, b) => a.order - b.order)
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <tbody>
          {grid.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                if (!cell) {
                  return <td key={ci} className="w-12 h-10" />
                }

                const key = `${ri},${ci}`
                const corps = corpsAt[key] || []
                const zoneClass = ZONE_COLORS[cell.zone] || ZONE_COLORS.normal
                const isTarget = !!onCellClick && !!movingCorp

                return (
                  <td
                    key={ci}
                    onClick={() => isTarget && onCellClick(ri, ci)}
                    className={`w-12 h-10 border border-broker-border text-center relative ${zoneClass} ${
                      cell.canPar ? 'ring-1 ring-inset ring-broker-gold' : ''
                    } ${isTarget ? 'cursor-pointer hover:ring-2 hover:ring-amber-400' : ''}`}
                  >
                    <div className="text-[10px] leading-tight">{cell.price}</div>
                    {corps.length > 0 && (
                      <div className="flex gap-0.5 justify-center mt-0.5 items-center">
                        {corps.map((entry, idx) => {
                          const corp = game.corporations.find((c) => c.sym === entry.sym)
                          const isSelected = movingCorp === entry.sym
                          return (
                            <span key={entry.sym} className="inline-flex flex-col items-center">
                              {/* Up arrow (left in game terms) */}
                              {isSelected && onReorder && idx > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); onReorder(entry.sym, -1) }}
                                  className="text-[7px] text-amber-400 leading-none hover:text-white">▲</button>
                              )}
                              <div
                                className={`w-3 h-3 rounded-full text-[6px] flex items-center justify-center font-bold cursor-pointer hover:ring-1 hover:ring-white ${
                                  isSelected ? 'ring-2 ring-amber-400 animate-pulse' : ''
                                }`}
                                style={{ backgroundColor: corp?.color, color: corp?.textColor || '#fff' }}
                                title={entry.sym}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!onCellClick) {
                                    useUIStore.getState().setActiveCorp(entry.sym)
                                    useUIStore.getState().setActiveTab('corps')
                                  }
                                }}
                              />
                              {/* Down arrow (right in game terms) */}
                              {isSelected && onReorder && idx < corps.length - 1 && (
                                <button onClick={(e) => { e.stopPropagation(); onReorder(entry.sym, 1) }}
                                  className="text-[7px] text-amber-400 leading-none hover:text-white">▼</button>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
