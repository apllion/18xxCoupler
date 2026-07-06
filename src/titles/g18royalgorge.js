import { defaults } from './defaults.js'

export const g18royalgorge = {
  ...defaults,
  maturity: 1, testQuality: 1, titleId: 'g18royalgorge',
  gameInfo: '• Metal companies (CF&I, VGC) as non-rail investable corps alongside 11 railroad corps • Gold and coal resources shipped for revenue, debt tokens constrain operations • Treaty of Boston event reshapes the competitive landscape mid-game • Incremental capitalization, 20% float, sell/buy stock rounds • 1D single-row market (28 spaces), unlimited bank • English auction for 18 privates across Yellow/Green/Brown tiers • 4 phases (Yellow/Green/Brown/Silver), 6x2 multiplier train is unlimited • 2-4 players, Fremont County Colorado setting, highly thematic',
  specialties: 'Mining tokens • Coal/ore revenue bonuses',
  implemented: 'Shares • Dividends • Debt tokens (18RG) • Metal companies (config)',
  title: '18 Royal Gorge', subtitle: 'The Royal Gorge Wars', designer: 'Kayla Ross & Denman Scofield',
  location: 'Fremont County, Colorado', minPlayers: 2, maxPlayers: 4,
  bankCash: 99999, startingCash: { 2: 800, 3: 550, 4: 400 }, certLimit: { 2: 20, 3: 14, 4: 10 },
  currencyFormat: '$', capitalization: 'incremental', floatPercent: 20, sellBuyOrder: 'sell_buy',
  emergencyBuy: 'president_pays',  // President contributes cash
  sellMovement: 'left_share_pres', // Rails: left per share (blocked by pres). Metals: none (handled via type check)
  dividendMovement: '18rg',        // right = floor(rev/price), max 3; withhold left 1

  // Inter-corp debt: Treaty of Boston event
  loans: {
    type: '18rg_debt',
    debtStartPrice: 50,       // Starting price per debt token
    debtPriceStep: 10,        // Price increases $10 per OR
    debts: [
      { debtor: 'RG', creditorType: 'corp', creditor: 'SF', tokens: 4,
        endgamePenalty: { 1: 2, 2: 3, 3: 5, 4: 8 } },  // steps left by remaining tokens
      { debtor: 'SF', creditorType: 'private', creditor: 'G1', tokens: 2,
        endgamePenalty: { 1: 1, 2: 3 } },
    ],
  },
  market: [
    ['30','35','40','45','50','55','60p','65p','70p','80p','90x','100x','110x','120x','130z','145z','160z','180z','200','220','240','260','280','310e','340e','380e','420e','460e'],
  ],
  phases: [
    { name: 'Yellow', trainLimit: 2, tiles: ['yellow'], operatingRounds: 2 },
    { name: 'Green', on: '3+', trainLimit: 2, tiles: ['yellow','green'], operatingRounds: 2 },
    { name: 'Brown', on: '4+', trainLimit: 2, tiles: ['yellow','green','brown'], operatingRounds: 2 },
    { name: 'Silver', on: '5+', trainLimit: 2, tiles: ['yellow','green','brown','gray'], operatingRounds: 2 },
  ],
  trains: [
    { name: '2+', distance: 2, price: 80, rustsOn: '4+', num: 4 },
    { name: '3+', distance: 3, price: 180, rustsOn: '6x2', num: 4 },
    { name: '4+', distance: 4, price: 400, num: 3 },
    { name: '5+', distance: 5, price: 500, num: 2 },
    { name: '6x2', distance: 6, price: 650, num: 99 },
  ],
  corporations: [
    { sym: 'RG', name: 'Denver & Rio Grande Western', tokens: [0,40,60], color: '#d81e3e', coordinates: 'L2' },
    { sym: 'SF', name: 'Santa Fe Railroad', tokens: [0,40,60,80], color: '#800080', coordinates: 'O15' },
    { sym: 'KP', name: 'Kansas Pacific Railway', tokens: [0,40,60,80], color: '#808080', coordinates: 'O5' },
    { sym: 'SPP', name: 'Denver, South Park & Pacific Railroad', tokens: [0,40,60,80], color: '#f48221', coordinates: 'B6' },
    { sym: 'PAV', name: 'Pueblo and Arkansas Valley Railroad', tokens: [0,40,60,80], color: '#025aaa', coordinates: 'L14' },
    { sym: 'NO', name: 'Denver & New Orleans', tokens: [0,40,60], color: '#000', coordinates: 'L8' },
    { sym: 'CM', name: 'Colorado Midland Railway', tokens: [0,40,60], color: '#237333', coordinates: 'B2' },
    { sym: 'S', name: 'Silverton Railway', tokens: [0,40,60], color: '#fff', textColor: '#000', coordinates: 'C17' },
    { sym: 'FCC', name: 'Florence & Cripple Creek Railroad', tokens: [0,40], color: '#FFF500', textColor: '#000', coordinates: 'I13' },
    { sym: 'CSCC', name: 'Colorado Springs & Cripple Creek District', tokens: [0,40], color: '#32763f', coordinates: 'K7' },
    { sym: 'CS', name: 'Colorado & Southern', tokens: [0,40], color: '#110a0c', coordinates: 'J2' },
    { sym: 'CF&I', name: 'Colorado Fuel & Iron', tokens: [], color: '#808080', type: 'metal', shares: [10,10,10,10,10,10,10,10,10,10] },
    { sym: 'VGC', name: 'Victor Gold Company', tokens: [], color: '#ffd700', textColor: '#000', type: 'metal', shares: [10,10,10,10,10,10,10,10,10,10] },
  ],

  pregame: [{ id: 'auction', label: 'Private Auction', type: 'english' }],

  companies: [
    { sym: 'Y1', name: 'St. Cloud Hotel', value: 50, revenue: 5, desc: 'Hotel token. $20 revenue per stop. Never closes.' },
    { sym: 'Y2', name: 'Ghost Town Tour Co.', value: 45, revenue: 15, desc: 'Owning corp places Ghost Town tokens ($10 revenue each). Closes on first 5+.' },
    { sym: 'Y3', name: 'Coal Creek Mines', value: 40, revenue: 5, desc: 'Owning corp receives coal cubes when any corp runs through Coal Creek. Closes on first 5+.' },
    { sym: 'Y4', name: 'William Palmer', value: 75, revenue: 5, desc: '10% Rio Grande + 10% CF&I. Cannot sell to corp. Closes on first 5+.',
      canSellToCorp: false, sharesGranted: [{ corpSym: 'RG', percent: 10 }, { corpSym: 'CFI', percent: 10 }] },
    { sym: 'Y5', name: 'Colorado State Prison', value: 70, revenue: 10, desc: 'Build in terrain at 1/2 price. Closes on first 5+.' },
    { sym: 'Y6', name: 'Local Jeweler', value: 20, revenue: 5, desc: '$5 from bank per gold shipment, paid to owner at start of SR. Closes on first 5+.',
      canSellToCorp: false },
    { sym: 'G1', name: 'Doc Holliday', value: 55, revenue: 10, desc: 'Acquires 2 debt tokens during Treaty of Boston. Closes when debt paid.',
      canSellToCorp: false },
    { sym: 'G2', name: '13LB Gold Nugget', value: 40, revenue: 5, desc: 'Once per game, owning corp ships 1 gold for $130 instead of $50. Closes on first 5+.' },
    { sym: 'G3', name: 'Hanging Bridge Lease', value: 50, revenue: 10, desc: 'Run through Royal Gorge by paying 10% dividend to Rio Grande. Closes on first 5+.' },
    { sym: 'G4', name: 'Florence Oil Fields', value: 75, revenue: 25, desc: 'Green Phase: $25 revenue per OR. Cannot close.',
      activeInPhase: 'Green', neverCloses: true, canSellToCorp: false },
    { sym: 'G5', name: 'Metals Investor', value: 25, revenue: 5, desc: 'Buy 1 CF&I and/or 1 VGC share at discount each SR. Closes on first 5+.',
      canSellToCorp: false },
    { sym: 'G6', name: 'Coal Depot', value: 10, revenue: 5, desc: '1 coal cube per $10 paid. Owning corp uses cubes for extra stops. Closes on first 5+.' },
    { sym: 'B1', name: 'Silver Mines', value: 70, revenue: 25, desc: 'Brown Phase: $25 revenue per OR. Never closes.',
      activeInPhase: 'Brown', neverCloses: true },
    { sym: 'B2', name: 'Sulphur Springs', value: 50, revenue: 0, desc: 'Owning corp can close to upgrade Sulphur Springs to city. If player-owned, $50 revenue in Brown Phase if connected.' },
    { sym: 'B3', name: 'Steel Depot', value: 55, revenue: 10, desc: '5 steel cubes. Owning corp uses 0-2 per OR for free yellow track. Closes on first 5+.' },
    { sym: 'B4', name: 'Gold Miner', value: 20, revenue: 0, desc: 'Acts as 20% share of Victor Gold Company. Does not count as certificate. Closes on first 5+.',
      canSellToCorp: false, sharesGranted: [{ corpSym: 'VGC', percent: 20 }] },
    { sym: 'B5', name: 'Track Engineer', value: 60, revenue: 10, desc: 'Each OR, treat one train as +1 distance. Closes on first 5+.' },
    { sym: 'B6', name: 'U.S. Mint Worker', value: 40, revenue: 5, desc: 'Close to buy 1-2 VGC shares at 50% discount. Closes on first 5+.',
      canSellToCorp: false },
  ],
}
