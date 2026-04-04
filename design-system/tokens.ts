// ============================================================
// SwingSense Design System — tokens.ts
// Single source of truth. Import from here only.
// Never hardcode hex values in component files.
// ============================================================

export const colors = {
  bg: {
    // Base surfaces
    base: '#0a0a0a', // screen background
    surface: '#161616', // cards, inputs, tab containers
    surfaceHover: '#1e1e1e', // hover / pressed state on surfaces
    input: '#1e1e1e', // text input background

    // Brand
    gold: '#f0a500', // primary CTA, active tab fill
    goldDim: '#2a1f00', // icon backgrounds, muted gold surfaces
    logoTile: '#1a6a45', // LogoTile background (green)

    // Semantic — positive
    green: '#3dbd7a', // tip checkmarks, drill step circles fill
    greenDim: '#0d2218', // delta pill bg, action icon bg (record)
    greenRing: '#1a3a28', // drill step number circle bg

    // Semantic — negative
    redDim: '#2a0a0a', // trend worse badge bg

    // Trend states
    trendBetter: '#0d2218', // SwingListItem "Better" badge bg
    trendSame: '#1e1e1e', // SwingListItem "Same" badge bg
    trendWorse: '#2a0a0a', // SwingListItem "Worse" badge bg

    // Action card icon slots
    actionIconGold: '#2a1f00', // Upload from Library icon bg
    actionIconGreen: '#0d2218', // Record Now icon bg

    // Auth screen
    authGradientTop: '#0a1a14', // LinearGradient top color (Login screen only)
    authGradientBottom: '#000000', // LinearGradient — black from ~40% to bottom

    // Decorative
    ambientCircle: 'rgba(240,165,0,0.15)', // Analyze screen top-right circle
  },

  text: {
    primary: '#ffffff',
    secondary: 'rgba(255,255,255,0.65)',
    muted: 'rgba(255,255,255,0.35)',
    hint: 'rgba(255,255,255,0.25)',

    // Brand
    gold: '#f0a500',
    green: '#3dbd7a',
    red: '#e05454',

    // Trend states
    trendBetter: '#3dbd7a',
    trendSame: 'rgba(255,255,255,0.35)',
    trendWorse: '#e05454',

    // Inputs
    inputPlaceholder: 'rgba(255,255,255,0.25)',

    // Analyze screen
    greeting: 'rgba(255,255,255,0.35)', // "HEY, JARED WALL"

    /** PrimaryButton label on gold (DESIGN_SYSTEM) */
    onGold: '#000000',
  },

  border: {
    subtle: 'rgba(255,255,255,0.07)', // default card border
    dim: 'rgba(255,255,255,0.10)', // slightly more visible
    medium: 'rgba(255,255,255,0.15)', // hover states
    gold: '#f0a500', // active input border
  },
}

export const typography = {
  display: "'Bebas Neue', Impact, sans-serif", // scores, headlines, CTA labels
  body: "'Inter', -apple-system, sans-serif", // all other text
}

export const fontSizes = {
  heroScore: 58, // HeroScore large ring number
  display: 38, // Wordmark on Login
  displaySm: 32, // Wordmark on Splash
  screenTitle: 36, // ScreenHeader (e.g. "SWING HISTORY")
  headline: 48, // HeroHeader ("ANALYZE YOUR SWING")
  subScore: 22, // SubScoreCard number
  listScore: 20, // SwingListItem ScoreRing number
  batSpeed: 48, // StatDisplay large number
  ctaLabel: 18, // PrimaryButton
  actionCardTitle: 15, // ActionCard title
  sectionTitle: 14, // SectionCard header
  body: 13, // General body text
  drillInstruction: 12, // DrillStep instruction (Inter)
  caption: 11, // Timestamps, muted labels
  label: 10, // Uppercase tracking labels
  micro: 9, // Badge text, pill labels
}

export const fontWeights = {
  light: '300',
  regular: '400',
  medium: '500',
  bold: '600',
}

export const letterSpacing = {
  wordmark: 6, // SWINGSENSE on Login
  wordmarkSm: 5, // SWINGSENSE on Splash
  cta: 2, // Button labels
  label: 3, // Uppercase section labels
  tagline: 4, // Subtitle under wordmark
  tight: 1, // Bebas Neue display numbers
  bottomTab: 1.5, // BottomTabBar labels
}

export const radius = {
  screen: 38, // Phone outer frame (reference only)
  logo: 22, // LogoTile corner radius (lg)
  logoMd: 16, // LogoTile corner radius (md)
  card: 14, // SectionCard, SwingListItem, ActionCard, PrimaryButton
  subCard: 12, // SubScoreCard, TextInput, TabSwitcher outer
  tab: 8, // Active tab inner radius (inside TabSwitcher)
  badge: 6, // TrendBadge, section icon bg
  pill: 20, // DeltaPill
  circle: 9999, // AvatarCircle, ScoreRing container, TipRow bullet
}

export const spacing = {
  screen: 20, // Left/right padding on all screens
  card: 16, // Internal padding on SectionCard, ActionCard
  cardSm: 12, // Internal padding on SubScoreCard
  cardGap: 12, // Vertical gap between cards
  subGrid: 8, // Gap in 2×2 SubScoreCard grid
  pillGap: 6, // Gap between DeltaPills
  deltaPillPadV: 5, // DeltaPill vertical padding
  deltaPillPadH: 10, // DeltaPill horizontal padding
  deltaPillInnerGap: 4, // Gap between label and delta inside DeltaPill
  iconGap: 8, // Gap between icon and label in rows
  sectionGap: 20, // Vertical gap between major screen sections
  inputGap: 8, // Gap between stacked inputs
  inputVertical: 14, // TextInput vertical padding
  inputHorizontal: 16, // TextInput horizontal padding
  drillGap: 14, // Gap between DrillStep rows
  tabPad: 3, // Padding inside TabSwitcher container
  tabInner: 9, // Padding inside individual tab option
  tipRowGap: 10, // Gap between TipRow instances (DESIGN_SYSTEM)
}

export const animation = {
  fadeUpDuration: 800, // ms — entrance animation
  fadeUpDelay: 200, // ms — stagger between elements
  splashHold: 1500, // ms — SplashScreen display before nav
  tabTransition: 200, // ms — TabSwitcher active state change
}

// ============================================================
// Component-level constants
// Reference these in components instead of magic numbers
// ============================================================

export const scoreRing = {
  sizeLg: 140, // HeroScore diameter
  sizeSm: 52, // SubScoreCard / SwingListItem diameter
  radiusLg: 60, // Arc path radius (lg)
  radiusSm: 22, // Arc path radius (sm)
  strokeLg: 8, // Large ring stroke width
  strokeSm: 3, // Small ring stroke width
  trackColor: '#1a1a1a',
  fillColor: '#f0a500',
}

export const avatar = {
  size: 80, // ProfileScreen AvatarCircle diameter
  ringWidth: 2, // Gold ring border width
  fontSize: 28, // Initials font size
}

export const bottomTab = {
  height: 80, // Total BottomTabBar height
  iconSize: 24, // Tab icon size
  activeColor: '#f0a500',
  inactiveColor: 'rgba(255,255,255,0.35)',
}

export const actionCard = {
  iconSize: 56, // Icon square container size
  iconInner: 28, // SVG icon size inside container
  iconRadius: 12, // Icon container border radius
  chevronColor: 'rgba(255,255,255,0.3)',
}

export const drillStep = {
  circle: 22, // Numbered bullet diameter
}

export const sectionCard = {
  iconSlot: 28, // Optional header icon container (square)
}

export const tipRow = {
  bullet: 20, // Filled green circle diameter
}

export const feedback = {
  iconButton: 32, // FeedbackRow thumbs circle size
}

export const logoTile = {
  sizeLg: 100,
  sizeMd: 64,
}

/** Similarity score → display color (same thresholds as ResultsScreen ScoreRing). */
export function getScoreColor(score: number): string {
  if (score >= 75) return colors.text.green // '#3dbd7a'
  if (score >= 50) return colors.text.gold // '#f0a500'
  return colors.text.red // '#e05454'
}
