// ContextBar — shared context-aware action bar for both skins.

import { useUIStore } from '../../store/uiStore.js'
import { playerSharePercent } from './useOverviewData.js'
import { getContextActions, groupActions } from './actionBarBuilder.js'

export function ContextBar({ game, selPlayer, selCorp, myPlayerId, setPanel, doAction, revRef, canUndo, undo, enterReplay, lastAction, skin }) {
  const superUmpire = useUIStore.getState().autoConfig.superUmpire
  const actions = getContextActions(game, selPlayer, selCorp, superUmpire)
  const { main, round } = groupActions(actions)
  const m = skin === 'moderator'

  const handlers = {
    priority: () => selPlayer && doAction({ type: 'SET_PRIORITY', playerId: selPlayer.id }),
    president: () => selPlayer && selCorp && doAction({ type: 'SWAP_PRESIDENT', playerId: selPlayer.id, corpSym: selCorp.sym }),
    buy: () => { if (!selCorp) return; if (!selCorp.ipoed) { setPanel('par'); return } if (selCorp.ipoShares > 0) doAction({ type: 'BUY_SHARE', playerId: selPlayer?.id, corpSym: selCorp.sym, source: 'ipo', percent: 10 }); else if (selCorp.marketShares > 0) doAction({ type: 'BUY_SHARE', playerId: selPlayer?.id, corpSym: selCorp.sym, source: 'market', percent: 10 }) },
    sell: () => selPlayer && selCorp && playerSharePercent(selPlayer, selCorp.sym) > 0 && doAction({ type: 'SELL_SHARES', playerId: selPlayer.id, corpSym: selCorp.sym, percent: 10 }),
    par: () => setPanel('par'),
    revenue: () => { setPanel('revenue'); setTimeout(() => revRef.current?.focus(), 50) },
    train: () => setPanel('train'),
    buyprivate: () => setPanel('buyprivate'),
    sellprivate: () => setPanel('private'),
    loan: () => setPanel('loan'),
    interest: () => selCorp && doAction({ type: 'PAY_INTEREST', corpSym: selCorp.sym }),
    corpshare: () => setPanel('corpshare'),
    execcar: () => setPanel('execcar'),
    export: () => setPanel('export'),
    concession: () => setPanel('concession'),
    merge: () => setPanel('merge'),
    issue: () => selCorp && doAction({ type: 'ISSUE_SHARES', corpSym: selCorp.sym }),
    redeem: () => selCorp && doAction({ type: 'REDEEM_SHARES', corpSym: selCorp.sym }),
    short: () => setPanel('short'),
    closeshort: () => setPanel('closeshort'),
    token: () => {
      if (!selCorp || selCorp.tokensPlaced >= selCorp.tokens.length) return
      const cost = selCorp.tokens[selCorp.tokensPlaced] || 0
      doAction({ type: 'PLACE_TOKEN', corpSym: selCorp.sym, price: cost })
    },
    discard: () => setPanel('discard'),
    removetoken: () => selCorp && doAction({ type: 'REMOVE_TOKEN', corpSym: selCorp.sym }),
    paybank: () => setPanel('paybank'),
    takecard: () => setPanel('takecard'),
    advance: () => doAction({ type: 'ADVANCE_ROUND' }),
    collect: () => doAction({ type: 'COLLECT_ALL_REVENUE' }),
    soldout: () => doAction({ type: 'SOLD_OUT_ADJUST' }),
    undo: () => canUndo() && undo(),
    replay: () => enterReplay(),
  }

  return (
    <div className={m
      ? 'bg-gray-900 border-t border-green-800 px-1 py-1 flex-shrink-0 flex items-center gap-1 flex-wrap'
      : 'bg-broker-surface border-t border-broker-border px-3 py-2 flex-shrink-0 flex items-center gap-1.5 flex-wrap'
    }>
      <span className="text-xs">
        {myPlayerId && <span className={m ? 'text-yellow-400' : 'text-broker-gold'}>MY </span>}
        <span className={m ? 'text-yellow-300' : 'text-white font-medium'}>{selPlayer?.name}</span>
        {selCorp && <> + <span className="font-bold" style={{ color: selCorp.color }}>{selCorp.sym}</span></>}
      </span>
      <span className={m ? 'text-blue-800' : 'text-broker-border'}>|</span>
      {main.map(a => (
        <button key={a.id} onClick={handlers[a.id] || (() => {})}
          className={m
            ? 'px-1.5 py-0.5 rounded text-xs font-mono bg-green-900/80 text-green-300 hover:bg-green-800'
            : `px-2 py-1 rounded text-xs font-medium ${a.id === 'sell' ? 'bg-red-900/50 text-red-300 hover:bg-red-800' : 'bg-broker-surface-hover text-white hover:bg-broker-gold/20'}`
          }>
          {m ? a.mLabel : a.label}
        </button>
      ))}
      <span className={m ? 'text-blue-800' : 'text-broker-border'}>|</span>
      {round.map(a => (
        <button key={a.id} onClick={handlers[a.id] || (() => {})}
          className={m
            ? 'px-1.5 py-0.5 rounded text-xs font-mono bg-green-900/80 text-green-300 hover:bg-green-800'
            : 'px-2 py-1 rounded text-xs font-medium bg-broker-surface-hover/50 text-broker-text-muted hover:text-white hover:bg-broker-surface-hover'
          }>
          {m ? a.mLabel : a.label}
        </button>
      ))}
      <span className={m ? 'text-blue-400 text-xs truncate ml-1 flex-1' : 'text-broker-text-muted text-xs truncate ml-1 flex-1'}>
        {lastAction?.description || ''}
      </span>
    </div>
  )
}
