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
import { ModeratorOverview } from '../overview/OverviewTab.jsx'
import ModeratorShell from './ModeratorShell.jsx'

const TAB_COMPONENTS = {
  overview: OverviewTab,
  moderator: ModeratorOverview,
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
  const skin = useUIStore((s) => s.skin)
  const TabComponent = TAB_COMPONENTS[activeTab] || SummaryTab
  const sync = useSyncContext()

  const roomBar = (
    <RoomBar
      roomId={sync?.roomId}
      peerCount={sync?.peerCount}
      status={sync?.status}
      createRoom={sync?.createRoom}
      joinRoom={sync?.joinRoom}
      leaveRoom={sync?.leaveRoom}
    />
  )

  // Moderator overview — fully self-contained, no chrome
  if (activeTab === 'moderator') {
    return (
      <div className="flex flex-col h-screen">
        {sync?.roomId && roomBar}
        <ModeratorOverview />
      </div>
    )
  }

  // Broker overview — has bottom nav for detail views
  if (activeTab === 'overview') {
    return (
      <div className="flex flex-col h-screen pb-12">
        {sync?.roomId && roomBar}
        <OverviewTab />
        <BottomNav />
      </div>
    )
  }

  // Detail tabs in Moderator skin
  if (skin === 'moderator') {
    return (
      <div className="flex flex-col h-screen">
        {roomBar}
        <ModeratorShell game={game} activeTab={activeTab}>
          <TabComponent />
        </ModeratorShell>
      </div>
    )
  }

  // Detail tabs in Broker skin
  return (
    <div className="flex flex-col h-screen">
      <Header syncDispatch={sync?.syncDispatch} />
      {roomBar}
      <TurnStatus />
      <main className="flex-1 overflow-y-auto pb-16">
        <TabComponent />
      </main>
      <BottomNav />
    </div>
  )
}
