// Info Card — privates, recent actions, train supply

export default function InfoCard({ data }) {
  const { game, fmt, me, myPlayerId } = data

  // My privates
  const myPrivates = myPlayerId
    ? (game.companies || []).filter(c => c.ownerType === 'player' && c.ownerId === myPlayerId && !c.closed)
    : []

  // All open privates
  const allPrivates = (game.companies || []).filter(c => !c.closed)

  // Recent actions (last 8)
  const recent = (game.actionLog || []).slice(-8).reverse()

  // Train supply
  const trainCounts = {}
  for (const t of (game.depot?.upcoming || [])) {
    if (!t.availableOn) trainCounts[t.name] = (trainCounts[t.name] || { count: 0, price: t.price })
    if (!t.availableOn) trainCounts[t.name].count++
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-lg font-bold mb-3">Info</div>

      {/* My privates */}
      {myPrivates.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-broker-text-muted mb-1 font-medium uppercase">My Privates</div>
          {myPrivates.map(c => (
            <div key={c.sym} className="bg-broker-surface rounded-lg p-2 mb-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-purple-300">{c.sym}</span>
                <span className="text-xs text-sky-300">{fmt(c.revenue)}/OR</span>
              </div>
              <div className="text-[10px] text-broker-text-muted">{c.desc || c.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* All privates (collapsed if I have some) */}
      {allPrivates.length > 0 && allPrivates.length !== myPrivates.length && (
        <div className="mb-3">
          <div className="text-xs text-broker-text-muted mb-1 font-medium uppercase">All Privates</div>
          {allPrivates.filter(c => !myPrivates.includes(c)).map(c => {
            const owner = c.ownerType === 'player'
              ? game.players.find(p => p.id === c.ownerId)?.name
              : c.ownerType === 'corporation' ? c.ownerId : '—'
            return (
              <div key={c.sym} className="flex items-center justify-between text-xs py-1 border-b border-broker-border/30">
                <span className="text-broker-text">{c.sym}</span>
                <span className="text-broker-text-muted">{owner} · {fmt(c.revenue)}/OR</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Train supply */}
      <div className="mb-3">
        <div className="text-xs text-broker-text-muted mb-1 font-medium uppercase">Train Supply</div>
        <div className="flex gap-1 flex-wrap">
          {Object.entries(trainCounts).map(([name, { count, price }]) => (
            <span key={name} className="text-xs bg-broker-surface px-2 py-1 rounded">
              {name}×{count} <span className="text-broker-text-muted">{fmt(price)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Recent actions */}
      {recent.length > 0 && (
        <div className="flex-1">
          <div className="text-xs text-broker-text-muted mb-1 font-medium uppercase">Recent</div>
          <div className="space-y-0.5">
            {recent.map((e, i) => (
              <div key={e.id || i} className={`text-[11px] py-0.5 ${i === 0 ? 'text-white font-medium' : 'text-broker-text-muted'}`}>
                {e.description || '—'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
