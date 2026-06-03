// StrategyCardsTab — shows strategy card assignments and status (PTG).
// Who holds each card, whether it's been used (unique action or train permit).

import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'

export default function StrategyCardsTab() {
  const game = useGameStore((s) => s.game)
  const skin = useUIStore((s) => s.skin)
  const m = skin === 'moderator'

  if (!game || !game.title.strategyCards?.length) return null

  const titleCards = game.title.strategyCards
  const playerCards = game.players.flatMap(p =>
    (p.cards || []).map(c => ({ ...c, playerName: p.name, playerId: p.id }))
  )

  // Map card id → holder info
  const cardHolders = {}
  for (const pc of playerCards) {
    cardHolders[pc.id] = pc
  }

  // Unassigned cards (still in the deck)
  const assignedIds = new Set(playerCards.map(c => c.id))

  return (
    <div className={m
      ? 'font-mono text-xs p-2 space-y-3 overflow-y-auto bg-blue-950 text-blue-300 h-full'
      : 'text-sm p-3 space-y-4 overflow-y-auto bg-broker-bg h-full'
    }>
      <h2 className={m ? 'text-green-400 font-bold' : 'text-broker-text font-bold text-lg'}>
        Strategy Cards
      </h2>

      <div className="space-y-2">
        {titleCards.map(card => {
          const holder = cardHolders[card.id]
          const used = holder?.used
          const usedAs = holder?.usedAs
          const assignedTo = holder?.assignedTo

          return (
            <div key={card.id} className={m
              ? 'bg-blue-900/30 border border-blue-800 rounded p-3'
              : 'bg-broker-surface rounded-lg p-3 border border-broker-border'
            }>
              {/* Card header */}
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                  style={{ backgroundColor: card.color === 'white' ? '#e5e5e5' : card.color }} />
                <span className={`font-bold ${m ? 'text-white' : 'text-broker-text'}`}>
                  {card.name}
                </span>
                {holder && (
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                    used
                      ? 'bg-red-900/40 text-red-400'
                      : 'bg-green-900/40 text-green-400'
                  }`}>
                    {used ? 'Used' : 'Active'}
                  </span>
                )}
                {!holder && (
                  <span className={`ml-auto text-xs ${m ? 'text-blue-500' : 'text-broker-text-muted'}`}>
                    Unassigned
                  </span>
                )}
              </div>

              {/* Abilities */}
              <div className={`text-xs space-y-0.5 ${m ? 'text-blue-300' : 'text-broker-text-muted'}`}>
                <div><span className="font-medium">Permit:</span> {card.permit}</div>
                <div><span className="font-medium">Unique:</span> {card.unique}</div>
              </div>

              {/* Holder info */}
              {holder && (
                <div className={`mt-2 text-xs ${m ? 'text-blue-400' : 'text-broker-text-muted'}`}>
                  Held by <span className={m ? 'text-white' : 'text-broker-text'}>{holder.playerName}</span>
                  {assignedTo && (
                    <span> — attached to {assignedTo.corpSym} train</span>
                  )}
                  {usedAs === 'unique_action' && (
                    <span> — unique action used</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
