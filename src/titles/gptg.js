import { defaults } from './defaults.js'

export const gptg = {
  ...defaults,

  maturity: 4, testQuality: 2, titleId: 'gptg',
  gameInfo: '• 8 color-coded strategy cards grant station permits and unique one-shot abilities • Fixed 7 rounds, all 20% shares (5 per corp), CEO earns $10/round salary • Corps can buy shares of other corps and start new corps during operations • Corp mergers available from Brown phase: two peers combine, shares convert 20% to 10% • Incremental capitalization, 20% float (CEO share only), unlimited bank and cert limit • 2D grid market (11x7 uniform rows), tax on 60%+ ownership of a single corp • Color-named trains (Yellow through RenGreen), priority auction for initial order • 2-4 players, generic setting, fast-playing portable game',
  specialties: 'Strategy cards • CEO salary $10/round • 5→10 share merger • All 20% shares • Fixed 7 rounds',
  implemented: 'Shares • Dividends • PTG stock movement • Strategy cards (UI) • Mergers • 20% shares • Pay action',
  title: 'PTG',
  subtitle: 'Pocket Train Game',
  designer: 'Jonas Jones',
  location: 'Generic',
  minPlayers: 2,
  maxPlayers: 4,

  bankCash: 99999, // Not specified — effectively unlimited
  startingCash: { 2: 340, 3: 230, 4: 180 },
  certLimit: { 2: 99, 3: 99, 4: 99 }, // Unlimited share ownership per rules
  currencyFormat: '$',

  capitalization: 'incremental', // Floats on CEO share purchase
  floatPercent: 20, // CEO share = 20%, company floats immediately
  sellBuyOrder: 'sell_buy',
  emergencyBuy: 'president_pays',  // CEO contributes cash; bankruptcy ends game
  sellMovement: 'down_share', // One row down per share sold
  routeStopValues: [10, 20, 30, 40, 50, 60, 70, 80],
  marketShareLimit: 100, // No pool limit mentioned

  // Fixed 7 rounds
  gameEndCheck: { fixed_round: 'current_or' },
  fixedRounds: 7,

  // Stock market — share prices $50-$180, par prices $80-$110
  // Movement: right if rev >= 0.5x price, right 2 if rev >= 3x, left if rev < 0.5x or withhold
  // Up if can't go right, down if can't go left. Sold-out = up at end of round.
  // Bottom red row = no CEO salary
  dividendMovement: 'ptg_triple',
  market: [
    ['120','130','140','160','180e'],
    ['110p','120','130','140','160'],
    ['100p','110','120','130','140'],
    ['90p','100','110','120','130'],
    ['80p','90','100','110','120'],
    ['70','80','90','100','110'],
    ['60','70','80','90'],
    ['50r','60r','70r'],
  ],

  phases: [
    { name: 'Yellow', trainLimit: 2, tiles: ['yellow'], operatingRounds: 1 },
    { name: 'Green', on: '3', trainLimit: 2, tiles: ['yellow','green'], operatingRounds: 1 },
    { name: 'Brown', on: '4', trainLimit: 2, tiles: ['yellow','green','brown'], operatingRounds: 1 },
    { name: 'Grey', on: '6', trainLimit: 2, tiles: ['yellow','green','brown','gray'], operatingRounds: 1 },
    { name: 'Black', on: 'S', trainLimit: 2, tiles: ['yellow','green','brown','gray'], operatingRounds: 1 },
    { name: 'Renovated', on: '3R', trainLimit: 2, tiles: ['yellow','green','brown','gray'], operatingRounds: 1 },
  ],

  trains: [
    { name: '2', distance: 2, price: 120, rustsOn: '4', num: 4 },
    { name: '3', distance: 3, price: 170, rustsOn: '6', num: 4 },
    { name: '4', distance: 4, price: 290, rustsOn: 'S', num: 2 },
    { name: '6', distance: 6, price: 440, num: 2 },
    { name: 'S', distance: 99, price: 560, num: 3 },
    { name: '3R', distance: 3, price: 300, num: 4, availableOn: 'S',
      desc: 'Renovated 3-trains. Available after last S-train sold.' },
  ],

  // 8 companies, all identical structure
  // 5 shares: 1x CEO (20%) + 4x regular (20%). Merged = 10x 10%.
  shares: [20, 20, 20, 20, 20],

  corporations: [
    { sym: 'RED', name: 'Red Company', tokens: [0,10], color: '#d81e3e', floatPercent: 20 },
    { sym: 'BLU', name: 'Blue Company', tokens: [0,10], color: '#0189d1', floatPercent: 20 },
    { sym: 'GRN', name: 'Green Company', tokens: [0,10], color: '#237333', floatPercent: 20 },
    { sym: 'YEL', name: 'Yellow Company', tokens: [0,10], color: '#FFF500', textColor: '#000', floatPercent: 20 },
    { sym: 'PUR', name: 'Purple Company', tokens: [0,10], color: '#800080', floatPercent: 20 },
    { sym: 'BLK', name: 'Black Company', tokens: [0,10], color: '#333333', floatPercent: 20 },
    { sym: 'WHT', name: 'White Company', tokens: [0,10], color: '#cccccc', textColor: '#000', floatPercent: 20 },
    { sym: 'GRY', name: 'Grey Company', tokens: [0,10], color: '#808080', floatPercent: 20 },
  ],

  pregame: [{ id: 'priority', label: 'Priority Auction', type: 'priority' }],

  // No private companies in PTG — strategy cards are player-held
  companies: [],

  // Strategy cards: assigned to player when buying CEO share. Can use unique action OR assign as station permit to train.
  strategyCards: [
    { id: 'central_station', name: 'Central Station', color: 'blue',
      permit: 'Train not blocked by blue stations',
      unique: 'Place $20 token on non-city tile. Route gains +$20.' },
    { id: 'end_of_line', name: 'End of the Line', color: 'white',
      permit: 'Train not blocked by white stations',
      unique: 'Place barricade to permanently block rail connection between two tiles (rounds 3-7).' },
    { id: 'infrastructure_push', name: 'Infrastructure Push', color: 'green',
      permit: 'Train not blocked by green stations',
      unique: 'Place green tile in yellow phase or brown tile in green phase.' },
    { id: 'railroad_bridge', name: 'Railroad Bridge', color: 'red',
      permit: 'Train not blocked by red stations',
      unique: 'Place yellow tile adjacent to water edge of port tile (cannot be upgraded).' },
    { id: 'insider_affair', name: 'Insider Affair', color: 'purple',
      permit: 'Train not blocked by purple stations',
      unique: 'Buy one share from open market at any time.' },
    { id: 'neutral_station', name: 'Neutral Station', color: 'black',
      permit: 'Train not blocked by black stations',
      unique: 'Place neutral station in any open city. Adds +$10 to routes stopping there.' },
    { id: 'station_relocation', name: 'Station Relocation', color: 'yellow',
      permit: 'Train not blocked by yellow stations',
      unique: 'Relocate one placed station to any open city at no cost.' },
    { id: 'rail_contractor', name: 'Rail Contractor', color: 'grey',
      permit: 'Train not blocked by grey stations',
      unique: 'Reserve one tile for the duration of a round (only you can place it).' },
  ],

  variableTokenCost: true, // Token cost is free-entry (multiples of 10)

  // Corp share trading: step 3.1 sell, step 3.7 buy one share per turn
  corpCanBuyShares: true,
  corpCanSellShares: true,
  corpBuyLimit: 1,            // max 1 purchase per company turn
  corpCanBuyOwnShares: false, // cannot repurchase shares sold in same round (tracked at UI level)
  corpCanBuyPresident: true,  // can buy CEO share to start a new company
  corpCanStartCorps: true,    // can start new corps via CEO purchase
  corpNoCertLimit: true,      // unlimited share ownership

  // PTG-specific rules
  // halfPay defaults to false — PTG only has pay out or withhold
  ceoIncome: 10, // $10 per round per CEO share
  taxThresholds: [
    { minPercent: 60, maxPercent: 70, tax: 20 },
    { minPercent: 80, maxPercent: 90, tax: 40 },
    { minPercent: 100, maxPercent: 100, tax: 60 },
  ],
  // Merger: two equal companies combine into one. From brown phase, both must have operated once.
  merger: {
    type: 'ptg_combine',       // Two peers → composite
    fromPhase: 'Brown',        // Available from brown phase
    requireOperated: true,     // Both must have completed at least one train operation
    canReMerge: false,         // Merged company cannot merge again
    priceFormula: 'average',   // (priceA + priceB) / 2 rounded down to nearest market price
    shareConversion: '20_to_10', // 5x20% → 10x10%
    trainLimit: 2,
  },
  topBonusRounds: { 6: 30, 7: 50 }, // Extra dividend per share if in green box during rounds 6-7
}
