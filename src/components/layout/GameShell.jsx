import { useGameStore } from '../../store/gameStore.js'
import { useUIStore } from '../../store/uiStore.js'
import { useSyncContext } from '../../hooks/SyncContext.jsx'
import Header from './Header.jsx'
import RoomBar from './RoomBar.jsx'
import TurnStatus from './TurnStatus.jsx'
import BottomNav from './BottomNav.jsx'
import MarketTab from '../market/MarketTab.jsx'
import CorpsTab from '../corps/CorpsTab.jsx'
import PrivatesTab from '../privates/PrivatesTab.jsx'
import PlayersTab from '../players/PlayersTab.jsx'
import SummaryTab from '../summary/SummaryTab.jsx'
import BeerMarketTab from '../beer/BeerMarketTab.jsx'
import OverviewTab from '../overview/OverviewTab.jsx'
import AuctionGuide from '../auction/AuctionGuide.jsx'

const TAB_COMPONENTS = {
  overview: OverviewTab,
  market: MarketTab,
  corps: CorpsTab,
  players: PlayersTab,
  privates: PrivatesTab,
  beer: BeerMarketTab,
  summary: SummaryTab,
}

export default function GameShell() {
  const game = useGameStore((s) => s.game)
  const activeTab = useUIStore((s) => s.activeTab)
  const viewMode = useUIStore((s) => s.viewMode)
  const TabComponent = TAB_COMPONENTS[activeTab] || SummaryTab
  const inPregame = game?.roundTracker?.inPregame
  const sync = useSyncContext()

  // Classic mode: Lemmi-style full screen, no header/nav chrome
  if (viewMode === 'classic' && !inPregame) {
    return (
      <div className="flex flex-col h-screen">
        <OverviewTab />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <Header syncDispatch={sync?.syncDispatch} />
      <RoomBar
        roomId={sync?.roomId}
        peerCount={sync?.peerCount}
        status={sync?.status}
        createRoom={sync?.createRoom}
        joinRoom={sync?.joinRoom}
        leaveRoom={sync?.leaveRoom}
      />
      {!inPregame && <TurnStatus />}
      <main className="flex-1 overflow-y-auto pb-16">
        {inPregame ? <AuctionGuide /> : <TabComponent />}
      </main>
      {!inPregame && <BottomNav />}
    </div>
  )
}
