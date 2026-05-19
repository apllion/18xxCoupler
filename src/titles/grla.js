import { defaults } from './defaults.js'

export const grla = {
  ...defaults,

  titleId: 'grla',
  title: 'Railways of the Lost Atlas',
  subtitle: 'Build, Merge, Prosper',
  designer: 'Jacob Schacht & Kevin Delger',
  location: 'Procedural Map',
  minPlayers: 2,
  maxPlayers: 5,

  bankCash: 99999, // Effectively unlimited (money cards)
  startingCash: { 2: 450, 3: 300, 4: 275, 5: 220 },
  certLimit: { 2: 99, 3: 99, 4: 99, 5: 99 }, // No certificate limit per rules
  currencyFormat: '$',

  capitalization: 'incremental', // President's bid goes to company treasury
  floatPercent: 0, // Floats immediately on auction
  sellBuyOrder: 'sell_buy',
  sellMovement: 'down_per_sale', // Stock drops per sale (variant: per share)

  // Fixed rounds: 4 cycles (short) or 6 cycles (long)
  // Each cycle = SR + OR + OR + Merger Round
  gameEndCheck: { fixed_round: 'current_or' },
  fixedRounds: 4, // Short game default

  // Stock track: 1D track, values expand with phase
  // Yellow phase: 60-90, Green phase: 60-110, Purple phase: 60-135
  market: [
    ['60p','65p','70p','75p','80p','85p','90p','95p','100p','105p','110p','115p','120p','125p','130p','135p','140','145','150','155','160','165','170','175','180','190','200','220','240','260','280','300','330','360','400'],
  ],

  // Phases triggered by train purchases
  phases: [
    { name: 'Yellow', trainLimit: { minor: 2, major: 4 }, tiles: ['yellow'], operatingRounds: 2 },
    { name: 'Green', on: '3', trainLimit: { minor: 2, major: 4 }, tiles: ['yellow', 'green'], operatingRounds: 2 },
    { name: 'Purple', on: '5', trainLimit: { minor: 2, major: 3 }, tiles: ['yellow', 'green', 'brown'], operatingRounds: 2 },
    { name: 'Grey', on: '7', trainLimit: { minor: 1, major: 2 }, tiles: ['yellow', 'green', 'brown', 'gray'], operatingRounds: 2 },
  ],

  trains: [
    { name: '2', distance: 2, price: 100, rustsOn: '4', num: 7 },
    { name: '3', distance: 3, price: 200, rustsOn: '6', num: 5 },
    { name: '4', distance: 4, price: 300, rustsOn: '7/∞', num: 4 },
    { name: '5', distance: 5, price: 450, num: 3 },
    { name: '6', distance: 6, price: 550, num: 3 },
    { name: '7', distance: 7, price: 750, num: 2 },
    { name: '∞', distance: 99, price: 1000, num: 99 },
  ],

  // 5 shares per minor: 1 presidency (2 shares worth) + 3 single shares
  // Minors: president = 40%, 3x 20% = total 100%
  shares: [40, 20, 20, 20],

  // 12 Minor Companies — each with a unique ability
  corporations: [
    { sym: 'ADP', name: 'Adaptive Company', tokens: [0, 40], color: '#4a90d9', type: 'minor',
      desc: 'Establishes home on any empty basic city spot.' },
    { sym: 'OVN', name: 'Overnight Company', tokens: [0, 40], color: '#2c3e50', type: 'minor',
      desc: 'May skip over blocked cities while tracing routes.' },
    { sym: 'SPC', name: 'Spacious Company', tokens: [0, 40], color: '#27ae60', type: 'minor',
      desc: 'Always has one extra train slot beyond the current limit.' },
    { sym: 'BRG', name: 'Bridging Company', tokens: [0, 40], color: '#8e44ad', type: 'minor',
      desc: 'Can lay bridge tiles over water hexes.' },
    { sym: 'TNL', name: 'Tunneling Company', tokens: [0, 40], color: '#d35400', type: 'minor',
      desc: 'Gains $60 into treasury each time it digs a mountain hex.' },
    { sym: 'NPT', name: 'Northern Port Company', tokens: [0, 40], color: '#2980b9', type: 'minor',
      desc: 'Home spot on special port tile with unique upgrade path.' },
    { sym: 'EXP', name: 'Express Company', tokens: [0, 40], color: '#c0392b', type: 'minor',
      desc: 'Boosts its train by one stop as long as it only owns one train.' },
    { sym: 'SUB', name: 'Suburban Company', tokens: [0, 40], color: '#f39c12', textColor: '#000', type: 'minor',
      desc: 'Has two suburb tokens for basic cities where it has no hub.' },
    { sym: 'RSC', name: 'Resourceful Company', tokens: [0, 40], color: '#1abc9c', type: 'minor',
      desc: 'Trains run one additional time when rusted instead of being discarded immediately.' },
    { sym: 'MIN', name: 'Mining Company', tokens: [0, 40], color: '#7f8c8d', type: 'minor',
      desc: 'Home spot on special mining tile with unique upgrade path.' },
    { sym: 'VET', name: 'Veteran Company', tokens: [0, 40], color: '#e74c3c', type: 'minor',
      desc: 'Experienced operations.' },
    { sym: 'PNR', name: 'Pioneer Company', tokens: [0, 40], color: '#16a085', type: 'minor',
      desc: 'Frontier expansion specialist.' },

    // 6 Major Corporations (each with two identity options — chosen at merge time)
    // These don't start in the game; they form when minors merge
    { sym: 'CORP_A', name: 'Corporation A', tokens: [0, 40, 40, 40], color: '#e74c3c', type: 'major',
      identityOptions: ['Atlas Railway', 'Continental Railroad'], floatPercent: 0 },
    { sym: 'CORP_B', name: 'Corporation B', tokens: [0, 40, 40, 40], color: '#3498db', type: 'major',
      identityOptions: ['Pacific Lines', 'Eastern Railway'], floatPercent: 0 },
    { sym: 'CORP_C', name: 'Corporation C', tokens: [0, 40, 40, 40], color: '#2ecc71', type: 'major',
      identityOptions: ['National Express', 'Imperial Transit'], floatPercent: 0 },
    { sym: 'CORP_D', name: 'Corporation D', tokens: [0, 40, 40, 40], color: '#9b59b6', type: 'major',
      identityOptions: ['Royal Railways', 'Southern Line'], floatPercent: 0 },
    { sym: 'CORP_E', name: 'Corporation E', tokens: [0, 40, 40, 40], color: '#f1c40f', textColor: '#000', type: 'major',
      identityOptions: ['Western Pacific', 'Northern Rail'], floatPercent: 0 },
    { sym: 'CORP_F', name: 'Corporation F', tokens: [0, 40, 40, 40], color: '#1abc9c', type: 'major',
      identityOptions: ['Pioneer Railroad', 'Mountain Line'], floatPercent: 0 },
  ],

  // Auction-based pregame — minors are auctioned from a matrix
  pregame: [{ id: 'auction', label: 'Minor Company Auction', type: 'english' }],

  // No private companies — abilities are on the minor companies themselves
  companies: [],

  // Merger: Two minors merge into a chosen Major Corporation during Merger Round.
  // Merger Round happens after both ORs if green phase has been entered.
  // Presidents must agree. Average stock price of both minors, rounded down.
  // Minor abilities persist. Player with most shares becomes president.
  // President chooses Major Corporation identity (from two options).
  merger: {
    type: 'rla_merge',            // Two minors → chosen major (with identity selection)
    mergerRound: true,            // Dedicated Merger Round after ORs
    fromPhase: 'Green',           // Available from green phase
    priceFormula: 'average',      // Average of both minor prices, rounded down
    abilitiesPersist: true,       // Minor company abilities carry over
    presidentChoosesCorp: true,   // President selects which Major Corp to form
    identityChoice: true,         // Each Major Corp has two identity options
    trainLimit: { minor: 2, major: 4 }, // Different limits
  },

  // No half pay — full pay or full withhold only. Double jumps possible.
  halfPay: false,

  variants: {
    'long_game': {
      label: 'Long Game (6 Cycles)',
      desc: '6 cycles instead of 4. Add 5th player support.',
      fixedRounds: 6,
    },
    'stock_drops_per_share': {
      label: 'Stock Drops Per Share',
      desc: 'Harsher stock trashing — price drops per share sold, not per sale.',
      sellMovement: 'down_share',
    },
  },
}
