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
import BeerMarketTab from '../beer/BeerMarketTab.jsx'
import OverviewTab from '../overview/OverviewTab.jsx'
import ActionToast from './ActionToast.jsx'
import EndgameCalcTab from '../overview/EndgameCalcTab.jsx'
import RouteCalcTab from '../overview/RouteCalcTab.jsx'
import LoanChartTab from '../overview/LoanChartTab.jsx'
import StrategyCardsTab from '../overview/StrategyCardsTab.jsx'
import RoundTrackerTab from '../overview/RoundTrackerTab.jsx'
// PlusPlus: analysis tab (stripped from Broker build)
const PP = !!import.meta.env.VITE_PLUSPLUS || import.meta.env.DEV
const AnalysisTab = PP ? (await import('../overview/AnalysisTab.jsx')).default : null

const TAB_COMPONENTS = {
  overview: OverviewTab,
  endgame: EndgameCalcTab,
  routes: RouteCalcTab,
  ...(AnalysisTab ? { analysis: AnalysisTab } : {}),
  market: MarketTab,
  corps: CorpsTab,
  players: PlayersTab,
  privates: PrivatesTab,
  beer: BeerMarketTab,
  rounds: RoundTrackerTab,
  loanchart: LoanChartTab,
  cards: StrategyCardsTab,
  log: (await import('../overview/ActionLog.jsx')).default,
}

export default function UmpireShell() {
  const activeTab = useUIStore((s) => s.activeTab)
  const TabComponent = TAB_COMPONENTS[activeTab] || OverviewTab
  const sync = useSyncContext()

  const roomBar = (
    <RoomBar
      roomId={sync?.roomId}
      peerCount={sync?.peerCount}
      status={sync?.status}
      createRoom={sync?.createRoom}
      joinRoom={sync?.joinRoom}
      leaveRoom={sync?.leaveRoom}
      savedRoom={sync?.savedRoom}
      rejoinRoom={sync?.rejoinRoom}
    />
  )

  // Overview — only show room bar when connected
  if (activeTab === 'overview') {
    return (
      <div className="flex flex-col h-screen pb-12">
        {sync?.roomId && roomBar}
        <TurnStatus />
        <OverviewTab />
        <ActionToast />
        <BottomNav />
      </div>
    )
  }

  // Detail tabs — no RoomBar or TurnStatus (those are for overview only)
  return (
    <div className="flex flex-col h-screen">
      <Header syncDispatch={sync?.syncDispatch} />
      <main className="flex-1 overflow-y-auto pb-16">
        <TabComponent />
      </main>
      <ActionToast />
      <BottomNav />
    </div>
  )
}
