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

    // Premium Analyze action cards (glass surface)
    premiumActionCard: 'rgba(255,255,255,0.04)',
    premiumActionCardPressed: 'rgba(255,255,255,0.06)',

    // Branded splash gradient stops
    splashTop: '#061226',
    splashMid: '#02050A',
    splashBase: '#000000',

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
    greeting: 'rgba(255,255,255,0.35)', // legacy HeroHeader uppercase greeting
    homeMuted: 'rgba(255,255,255,0.55)', // Premium ActionCard subtitles
    homeGreeting: 'rgba(255,255,255,0.38)', // Analyze home dynamic greeting (secondary)
    homeTagline: 'rgba(255,255,255,0.47)', // Analyze home product tagline (tertiary)
    splashTagline: 'rgba(255,255,255,0.45)', // BrandedSplash tagline under wordmark

    /** PrimaryButton label on gold (DESIGN_SYSTEM) */
    onGold: '#000000',
  },

  border: {
    subtle: 'rgba(255,255,255,0.07)', // default card border
    dim: 'rgba(255,255,255,0.10)', // slightly more visible
    medium: 'rgba(255,255,255,0.15)', // hover states
    gold: '#f0a500', // active input border
    premiumActionCard: 'rgba(255,255,255,0.06)',
    premiumActionCardPressed: 'rgba(255,255,255,0.14)',
    actionIconGold: 'rgba(245,158,11,0.22)',
    actionIconEmerald: 'rgba(16,185,129,0.22)',
    /** Auth — Continue with Google subtle edge */
    authGoogle: '#e0e0e0',
    /** Auth — Log in with Email outline */
    authEmail: '#333333',
  },

  /** DecisionFactors + hero ScoreRing — mechanic / overall score bands */
  core5: {
    bandLow: '#E24B4A', // red — 0–25
    bandMid: '#EF9F27', // amber — 26–54
    bandHigh: '#639922', // green — 55–79
    bandExcellent: '#5B4FE8', // purple — 80–89
    bandLegendary: '#C9A84C', // gold — 90+
  },

  /** Drill carousel — mechanic identity colors */
  mechanic: {
    stance: '#4A90D9', // blue
    load: '#F5A623', // orange
    power_position: '#639922', // green
    slot: '#9B59B6', // purple
    balance_at_contact: '#1ABC9C', // teal
  },

  /** Marketing / UI emerald — tabs, splash haze, Record action icon (distinct from semantic green) */
  brand: {
    emerald: '#10b981',
    goldGlow: '#f59e0b', // subtle icon halo (Tailwind amber-500)
  },

  shadow: {
    default: '#000000',
  },
}

export const typography = {
  display: "'BebasNeue_400Regular', Impact, sans-serif", // scores, headlines, CTA labels
  /** Screen title headers only (e.g. ScreenHeader, Analysis kicker) — Righteous */
  displayTitle: 'Righteous_400Regular',
  body: "'Inter', -apple-system, sans-serif", // all other text
}

export const fontSizes = {
  heroScore: 58, // HeroScore large ring number
  display: 38, // Wordmark on Login
  displaySm: 32, // Wordmark on Splash
  analysisKicker: 34, // AnalysisScreen "SWING ANALYSIS" kicker
  screenTitle: 40, // ScreenHeader (e.g. "SWING HISTORY")
  headline: 48, // HeroHeader ("ANALYZE YOUR SWING")
  wordmark: 40, // AnalyzeScreen returning-user Righteous SwingSense wordmark
  subScore: 22, // SubScoreCard number
  listScore: 20, // SwingListItem ScoreRing number
  batSpeed: 48, // StatDisplay large number
  ctaLabel: 18, // PrimaryButton
  /** Auth — Continue with Apple / Google / Email method buttons */
  oauthMethodLabel: 17,
  drillTitle: 16, // DrillCard title (bold)
  actionCardTitle: 15, // Legacy ActionCard title
  homeGreeting: 18, // Analyze home dynamic greeting
  homeTagline: 13, // Splash + shared product tagline base
  homeTaglineHero: 12, // Analyze home header tagline (1px below splash)
  premiumActionCardTitle: 20, // Premium ActionCard title
  premiumActionCardSubtitle: 13, // Premium ActionCard subtitle
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
} as const

export const letterSpacing = {
  wordmark: 6, // SWINGSENSE on Login
  wordmarkSm: 5, // SWINGSENSE on Splash
  wordmarkTight: -0.5, // AnalyzeScreen Righteous wordmark (Swing / Sense)
  cta: 2, // Button labels
  label: 3, // Uppercase section labels
  tagline: 4, // Subtitle under wordmark (Login)
  productTagline: 2.34, // 0.18em at 13px — home header + BrandedSplash
  tight: 1, // Bebas Neue display numbers
  bottomTab: 1.5, // BottomTabBar labels
}

export const radius = {
  screen: 38, // Phone outer frame (reference only)
  logo: 22, // LogoTile corner radius (lg)
  logoMd: 16, // LogoTile corner radius (md)
  card: 14, // SectionCard, SwingListItem, legacy ActionCard, PrimaryButton
  premiumActionCard: 24, // Premium Analyze Upload / Record cards
  premiumActionIcon: 14, // Icon slot inside premium ActionCard
  subCard: 12, // SubScoreCard, TextInput, TabSwitcher outer
  input: 10, // Small square media thumbs (e.g. Analyze last swing)
  xs: 4, // Micro badges on thumbnails
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
  /** Auth — OAuth / email method buttons */
  authMethodButton: 52,
  /** Auth — horizontal gap between icon column and label (matches spec 10px) */
  oauthMethodGap: 10,
  inputGap: 8, // Gap between stacked inputs
  inputVertical: 14, // TextInput vertical padding
  inputHorizontal: 16, // TextInput horizontal padding
  drillGap: 14, // Gap between DrillStep rows
  tabPad: 3, // Padding inside TabSwitcher container
  tabInner: 9, // Padding inside individual tab option
  tipRowGap: 10, // Gap between TipRow instances (DESIGN_SYSTEM)
  homeGreetingBelow: 0, // Greeting → wordmark (tight hero)
  homeWordmarkBelow: -5, // Wordmark → tagline (negative pulls tagline closer)
  homeTaglineBelow: 6, // Tagline → streak pill
  homeTaglineBelowContent: 14, // Tagline → first card when no streak
  homeStreakBelow: 8, // Streak pill → first card
  premiumActionCardPadH: 24,
  premiumActionCardPadV: 18,
  premiumActionIconTitleGap: 8,
  premiumActionTitleSubtitleGap: 6,
  premiumActionTextRowGap: 6,
  splashLogoToTagline: 24, // BrandedSplash hero → tagline (was 0 margin + tagline mb 22 ≈ layout)
  splashTaglineToDots: 22,
  splashHeroOffsetTop: -210,
}

export const animation = {
  fadeUpDuration: 800, // ms — entrance animation
  fadeUpDelay: 200, // ms — stagger between elements
  splashHold: 4000, // ms — SplashScreen display before nav (logo fade + glow + tagline)
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
  iconSize: 56, // Legacy icon square container size
  iconInner: 28, // Legacy SVG icon size inside container
  iconRadius: 12, // Legacy icon container border radius
  chevronColor: 'rgba(255,255,255,0.3)', // Legacy SectionCard-style ActionCard
}

/** Premium Upload / Record cards on Analyze home */
export const premiumActionCard = {
  minHeight: 138,
  bodyMinHeight: 96,
  padH: 24,
  padV: 18,
  iconTitleGap: 8,
  titleSubtitleGap: 6,
  textRowGap: 6,
  iconSlot: 54,
  iconInner: 27,
  iconRadius: radius.premiumActionIcon,
  textBlockMaxWidth: '78%' as const,
  pressScale: 0.98,
  pressMs: 150,
  chevronSize: 22,
  chevronColor: 'rgba(255,255,255,0.58)',
  titleFontWeight: '700' as const,
  titleLineHeightRatio: 1.2,
  subtitleLineHeightRatio: 1.35,
  glowCycleMs: 4000,
  glowPulseMin: 0.35,
  glowPulseMax: 0.55,
  glowShadowOpacityMin: 0.08,
  glowShadowOpacityMax: 0.16,
  iconGlowShadowRadius: 10,
  iconColumnMarginTop: -2,
  textBlockMarginTop: -4,
  shadowIos: {
    offset: { width: 0, height: 8 },
    opacity: 0.35,
    radius: 16,
  },
  shadowIosPressed: {
    offset: { width: 0, height: 10 },
    opacity: 0.48,
    radius: 20,
  },
  elevation: 6,
  elevationPressed: 10,
  iconElevation: 3,
}

export const premiumActionCardVariants = {
  gold: {
    iconBg: colors.bg.goldDim,
    borderColor: colors.border.actionIconGold,
    glowColor: colors.brand.goldGlow,
  },
  emerald: {
    iconBg: colors.bg.greenDim,
    borderColor: colors.border.actionIconEmerald,
    glowColor: colors.brand.emerald,
  },
} as const

export const homeHeader = {
  productTagline: 'AI-POWERED BASEBALL DEVELOPMENT',
} as const

export const splashBrand = {
  bgStops: [
    colors.bg.splashTop,
    colors.bg.splashMid,
    colors.bg.splashBase,
    colors.bg.splashBase,
  ] as const,
  bgLocations: [0, 0.18, 0.4, 1] as const,
  logoAspect: 682 / 1024,
  logoEntranceMs: 700,
  glowCycleMs: 4000,
  logoBaseVwRatio: 0.7,
  logoBaseMaxWidth: 340,
  logoSizeScale: 1.15,
  hazeSize: 1400,
  hazeBleedRatio: 0.12,
  hazeOpacityMin: 0.04,
  hazeOpacityMax: 0.08,
  dotSize: 6,
  dotGap: 10,
  dotOuterOpacity: 0.35,
  hazeLayerOpacities: {
    layerB: 0.72,
    layerC: 0.6,
    layerD: 0.55,
  },
} as const

export function splashLogoWidth(viewportWidth: number): number {
  const vw = splashBrand.logoBaseVwRatio * splashBrand.logoSizeScale;
  const max = splashBrand.logoBaseMaxWidth * splashBrand.logoSizeScale;
  return Math.min(viewportWidth * vw, max);
}

export function splashHazeFieldSize(): number {
  const bleed = splashBrand.hazeSize * splashBrand.hazeBleedRatio;
  return splashBrand.hazeSize + bleed * 2;
}

export function splashHazeBleed(): number {
  return splashBrand.hazeSize * splashBrand.hazeBleedRatio;
}

export const drillStep = {
  circle: 22, // Numbered bullet diameter
}

/** "Start drill →" / "View Analysis →" link on drill and last-swing cards */
export const drillCardLink = {
  fontSize: fontSizes.micro,
  fontWeight: fontWeights.medium,
  color: colors.text.gold,
  pressOpacity: 0.8,
} as const

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

export const camera = {
  controlButtonSize: 48, // Camera header and exit button size
  recordButtonSize: 80, // Large record button diameter
  recordDotSize: 24, // Inner recording dot size
  stopSquareSize: 20, // Stop button square size
  overlayBackground: 'rgba(0, 0, 0, 0.5)', // General overlay background
  headerOverlay: 'rgba(0, 0, 0, 0.3)', // Header button overlay
  timerOverlay: 'rgba(0, 0, 0, 0.7)', // Timer background overlay
  controlBackground: 'rgba(255, 255, 255, 0.2)', // Camera control button background
  recordingBackground: 'rgba(220, 38, 38, 0.3)', // Recording state background
}

export const header = {
  iconSize: 28, // Standard header icon size
  buttonSize: 48, // Header button container size
  safeAreaPadding: 60, // Top safe area padding
}

export const scoreCard = {
  circleSize: 28, // Score circle diameter
}

export const sparkline = {
  barWidth: 4, // Sparkline bar width
  barGap: 2, // Gap between sparkline bars
  barRadius: 1, // Sparkline bar border radius
  minHeight: 4, // Minimum bar height
  maxHeight: 16, // Maximum bar height
}

/** Similarity score → display color (aligned with `colors.core5` bands). */
export function getScoreColor(score: number): string {
  if (score >= 90) return colors.core5.bandLegendary // gold
  if (score >= 80) return colors.core5.bandExcellent // purple
  if (score >= 55) return colors.core5.bandHigh // green
  if (score >= 26) return colors.core5.bandMid // amber
  return colors.core5.bandLow // red
}

/** Core 5 / hero ring — score band color (null → hint). */
export function getCore5BandColor(score: number | null): string {
  if (score == null) return colors.text.hint
  if (score <= 25) return colors.core5.bandLow
  if (score < 55) return colors.core5.bandMid
  if (score < 80) return colors.core5.bandHigh
  if (score < 90) return colors.core5.bandExcellent
  return colors.core5.bandLegendary
}

/** Use on `<Text>` with `typography.displayTitle` (ScreenHeader, kicker, Righteous wordmarks). */
export const displayTitleProps = {
  numberOfLines: 1,
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.7,
} as const
