// OverviewTab — routes to Broker or Moderator skin based on uiStore.
// Default is BrokerOverview (modern). ModeratorOverview is the DOS retro skin.

import BrokerOverview from './BrokerOverview.jsx'
import ModeratorOverview from './ModeratorOverview.jsx'

// This component is used for activeTab === 'overview' (broker skin)
export default BrokerOverview

// Re-export moderator for direct use
export { ModeratorOverview }
