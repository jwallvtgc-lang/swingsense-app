# SwingSense Design System

> **The law of this codebase.** Every color, font, spacing value, and radius
> must come from `design-system/tokens.ts`. No hardcoded hex values in
> component files — ever. If a value isn't in tokens, add it there first.

---

## Typography

| Use | Font | Token |
|-----|------|-------|
| Scores, stats, CTA labels, numbered steps, numeric display | Bebas Neue | `typography.display` |
| Screen title headers (`ScreenHeader`, Analysis screen kicker) | Righteous | `typography.displayTitle` |
| All other text | Inter | `typography.body` |

**Rules:**
- **`typography.displayTitle`** uses **Righteous** (`Righteous_400Regular`, loaded via Expo Google Fonts) for **screen title headers** only: the **`ScreenHeader`** title (e.g. SWING HISTORY) and the **Analysis** screen kicker (SWING ANALYSIS). **`typography.display`** (Bebas Neue) remains for scores, numbers, rings, and CTAs — not those title lines.
- All screen title headers using **`typography.displayTitle`** must spread **`displayTitleProps`** from `tokens.ts` to prevent text wrapping at large accessibility font sizes: `<Text style={styles.title} {...displayTitleProps}>`
- The wordmark is always **ALL-CAPS**: `SWINGSENSE` with `SENSE` in gold (`colors.text.gold`). Never mixed case.
- Display numbers (scores, bat speed, stats) always use `typography.display`.
- Never use font weights 600 or 700 for body text — use 500 max.
- Letter spacing on the wordmark: `letterSpacing.wordmark` (6) on Login, `letterSpacing.wordmarkSm` (5) on Splash.

---

## Colors

Three accent colors. Each has a strict semantic meaning:

| Color | Hex | Meaning |
|-------|-----|---------|
| Gold | `#f0a500` | Primary — scores, CTAs, active states, brand accent |
| Green | `#3dbd7a` | Positive — improvement, tips, drill steps, "Better" trend |
| Red | `#e05454` | Negative — decline, "Worse" trend |

**Never use gold for positive/negative feedback — that's green/red's job.**
**Never use green for primary actions — that's gold's job.**

All surfaces use `colors.bg.surface` (`#161616`) on `colors.bg.base` (`#0a0a0a`).

---

## Tab Switchers

**One standard. No exceptions.**

All tab switchers in the app — both `AuthTabSwitcher` (Login) and
`ContentTabBar` (Analysis) — use the identical active state:

- **Active:** `colors.bg.gold` fill + `#000` text
- **Inactive:** transparent background + `colors.text.muted` text
- **Container:** `colors.bg.surface` (#161616), `spacing.tabPad` (3px) padding, `radius.subCard` (12px) outer radius
- **Tab inner radius:** `radius.tab` (8px)

Use the single `TabSwitcher` component for both. Props: `tabs`, `activeTab`, `onChange`.

---

## Cards

Three card types. Use the right one:

### SectionCard
Content container. No navigation. No chevron.
- bg: `colors.bg.surface`
- radius: `radius.card` (14px)
- padding: `spacing.card` (16px)
- Optional icon header: 28px square, `radius.badge` (6px), `colors.bg.goldDim` bg

### ActionCard (premium — Analyze home)
Primary Upload / Record actions on the Analyze tab. Vertical layout: icon → title → subtitle, chevron aligned to text block.

**Surface**
- bg: `colors.bg.premiumActionCard` (`rgba(255,255,255,0.04)`)
- pressed bg: `colors.bg.premiumActionCardPressed`
- border: `colors.border.premiumActionCard` / pressed: `colors.border.premiumActionCardPressed`
- radius: `radius.premiumActionCard` (24px)
- padding: `premiumActionCard.padH` (24) × `premiumActionCard.padV` (18)
- min height: `premiumActionCard.minHeight` (138)

**Typography**
- title: `fontSizes.premiumActionCardTitle` (20), `premiumActionCard.titleFontWeight` (700), `colors.text.primary`
- subtitle: `fontSizes.premiumActionCardSubtitle` (13), `colors.text.homeMuted`

**Icon slot (rounded square only — no circular halo)**
- size: `premiumActionCard.iconSlot` (54), inner icon: `premiumActionCard.iconInner` (27)
- radius: `radius.premiumActionIcon` (14)
- **Gold variant (Upload):** `premiumActionCardVariants.gold` — bg `colors.bg.goldDim`, border `colors.border.actionIconGold`, glow `colors.brand.goldGlow`, icon `colors.text.gold`
- **Emerald variant (Record):** `premiumActionCardVariants.emerald` — bg `colors.bg.greenDim`, border `colors.border.actionIconEmerald`, glow `colors.brand.emerald`, icon `colors.brand.emerald`

**Interaction**
- press scale: `premiumActionCard.pressScale` (0.98), duration `premiumActionCard.pressMs`
- chevron: `premiumActionCard.chevronColor`, size `premiumActionCard.chevronSize`
- subtle colored shadow on icon square (iOS); never use SVG `FeGaussianBlur` on splash-style haze

### ActionCard (legacy reference)
Older docs referenced `actionCard.iconSize` (56) / `radius.card` (14) row cards. New Analyze home uses **premium** tokens above.

### Analyze home header (`AnalyzeHeader`)
Stack order:
1. **Dynamic greeting** — local time via `greetingWithName()` → `Good Morning/Afternoon/Evening, {name}`
2. **SwingSense wordmark** — Righteous `Swing` + gold `Sense`, `fontSizes.wordmark`, `displayTitleProps`
3. **Product tagline** — `homeHeader.productTagline` (`AI-POWERED BASEBALL DEVELOPMENT`)
4. **Streak pill** — when streak &gt; 0, `StreakPill` below tagline

**Tokens**
- greeting: `fontSizes.homeGreeting` (18), `fontWeights.medium`, `colors.text.homeGreeting` (38% white — secondary), `spacing.homeGreetingBelow` (0)
- tagline: `fontSizes.homeTaglineHero` (12), `letterSpacing.productTagline`, uppercase, `colors.text.homeTagline` (~47% white — tertiary), `spacing.homeWordmarkBelow` (-5), `spacing.homeTaglineBelow` (6) / `homeTaglineBelowContent` (14), `spacing.homeStreakBelow` (8)
- **Hierarchy:** wordmark (primary) → greeting → tagline

### Branded splash (`BrandedSplash`)
- Gradient: `splashBrand.bgStops` / `splashBrand.bgLocations` (`colors.bg.splashTop` → `splashBase`)
- Logo width: `splashLogoWidth(viewportWidth)` from `splashBrand.logoBaseVwRatio` × `logoSizeScale`, cap `logoBaseMaxWidth`
- Haze: `colors.brand.emerald`, `splashBrand.hazeSize`, opacity `splashBrand.hazeOpacityMin`–`Max` — **gradient only, no SVG blur**
- Tagline: same copy as home (`homeHeader.productTagline`), style `colors.text.splashTagline`, `letterSpacing.productTagline`
- Loading dots: `colors.text.muted` outer, `colors.brand.emerald` center

### Brand accent aliases
| Token | Hex | Use |
|-------|-----|-----|
| `colors.brand.emerald` | `#10b981` | Record tab/action icon, splash haze (marketing emerald) |
| `colors.brand.goldGlow` | `#f59e0b` | Subtle gold icon halo on premium cards |
| `colors.text.green` | `#3dbd7a` | Semantic positive UI (tips, trends) — not the same as brand emerald |

### SubScoreCard
2×2 grid item. ScoreRing sm + label.
- bg: `colors.bg.surface`
- radius: `radius.subCard` (12px)
- padding: `spacing.cardSm` (12px)

---

## Score Rings

SVG arc rings only. No third-party progress libraries.

```
circumference = 2 × π × radius
filled = (score / 100) × circumference
stroke-dasharray = `${filled} ${circumference}`
```

| Size | Diameter | Radius | Stroke |
|------|----------|--------|--------|
| lg (HeroScore) | 140px | 60 | 8px |
| sm (SubScore / ListItem) | 52px | 22 | 3px |

Track color: `scoreRing.trackColor` (#1a1a1a)
Fill color: `scoreRing.fillColor` (#f0a500)
Always rotate container -90deg so arc starts at top.
Opacity on sm rings: 0.7 (slightly muted vs hero).

---

## Buttons

### PrimaryButton
- bg: `colors.bg.gold`
- text: `#000`, `typography.display`, `fontSizes.ctaLabel` (18px), `letterSpacing.cta` (2px)
- radius: `radius.card` (14px)
- padding: 15px vertical, `spacing.screen` (20px) horizontal
- Full width on all screens
- Optional leading icon slot

**No secondary button style exists yet.** If you need one, define it in tokens first.

---

## Screens

### AuthScreen (Login)
- **Only screen without BottomTabBar**
- Top ~40% has a `LinearGradient` from `colors.bg.authGradientTop` (#0a1a14) to `#000`
- Layout: centered, LogoTile → Wordmark → tagline → TabSwitcher → inputs → PrimaryButton

### SplashScreen
- Pure `#000` background
- Centered LogoTile (lg) + Wordmark (splash variant)
- Fade-up entrance: `animation.fadeUpDuration` (800ms), staggered `animation.fadeUpDelay` (200ms)
- Auto-navigates after `animation.splashHold` (1500ms)
- No interactivity

### AnalyzeScreen
- Has the decorative ambient circle: `position: absolute`, top-right, large (~280px diameter), `colors.bg.ambientCircle` bg
- **Do not extract this into a component** — it's a one-off layout element, hard-code in AnalyzeScreen directly
- HeroHeader: greeting in `colors.text.greeting`, headline in white + gold accent word

### AnalysisScreen
- Accessed via History list tap
- Has BackNav (not BottomTabBar at top)
- Two-tab content: Results (scores + bat speed + context) / Coaching (summary + action plan)

---

## BottomTabBar

Three tabs: **Analyze / History / Profile**

- Active: `bottomTab.activeColor` (#f0a500) icon + gold label
- Inactive: `bottomTab.inactiveColor` icon + muted uppercase label
- Height: `bottomTab.height` (80px)
- Icon size: `bottomTab.iconSize` (24px)
- Top hairline border: `colors.border.subtle`
- Background: `colors.bg.base`
- **Not shown on SplashScreen or AuthScreen**

---

## TrendBadge

Three states — all pill shape (`radius.pill`), `fontSizes.micro` (9px), bold:

| State | bg token | text token | symbol |
|-------|----------|------------|--------|
| Better | `colors.bg.trendBetter` | `colors.text.trendBetter` | ↗ |
| Same | `colors.bg.trendSame` | `colors.text.trendSame` | (none) |
| Worse | `colors.bg.trendWorse` | `colors.text.trendWorse` | ↘ |

---

## SwingListItem

Layout (left to right):
1. ScoreRing sm (52px)
2. Content column: date + TrendBadge (row) → insight snippet → bat speed (gold)
3. Actions: DeleteButton (trash icon) + chevron

- Card bg: `colors.bg.surface`, radius: `radius.card`, padding: `spacing.card`
- Bat speed: `typography.display`, `colors.text.gold`
- Date: `fontSizes.caption` (11px), `colors.text.muted`
- Insight: `fontSizes.body` (13px), `colors.text.secondary`

---

## DrillStep vs TipRow

These look similar but are different:

| | DrillStep | TipRow |
|--|-----------|--------|
| Bullet | Numbered circle (Bebas, green) | Filled green circle + white checkmark |
| Context | Action Plan — instructional | Tips card — informational |
| Gap | `spacing.drillGap` (14px) | 10px |

---

## AvatarCircle

- Size: `avatar.size` (80px)
- Gold ring: `avatar.ringWidth` (2px), `colors.text.gold`
- bg: `colors.bg.goldDim`
- Initials: `typography.display`, `fontSizes.heroScore` scaled down to `avatar.fontSize` (28px), `colors.text.gold`
- Build with `imageUri?: string` prop for future photo support

---

## DataRow (Profile screen)

Label left, value right, hairline separator below.

- Label: `colors.text.muted`, `fontSizes.body`
- Value: `colors.text.primary`, `fontSizes.body`
- `valueWeight` prop: `'normal'` (400) or `'bold'` (500)
- Separator: `colors.border.subtle`, 0.5px
- Padding: 12px vertical

---

## Spacing scale

| Token | Value | Use |
|-------|-------|-----|
| `spacing.screen` | 20px | Screen left/right padding |
| `spacing.card` | 16px | Card internal padding |
| `spacing.cardGap` | 12px | Gap between stacked cards |
| `spacing.subGrid` | 8px | 2×2 grid gap |
| `spacing.sectionGap` | 20px | Between major screen sections |
| `spacing.drillGap` | 14px | Between DrillStep rows |

---

## Component registry

| Component | File | Used on |
|-----------|------|---------|
| `LogoTile` | `components/LogoTile.tsx` | Splash, Login |
| `Wordmark` | `components/Wordmark.tsx` | Splash, Login |
| `TabSwitcher` | `components/TabSwitcher.tsx` | Login, Analysis |
| `TextInput` | `components/TextInput.tsx` | Login |
| `PrimaryButton` | `components/PrimaryButton.tsx` | Login, Analysis, History, Profile |
| `BottomTabBar` | `components/BottomTabBar.tsx` | Analyze, History, Profile |
| `BackNav` | `components/BackNav.tsx` | Analysis |
| `ScreenHeader` | `components/ScreenHeader.tsx` | History |
| `SectionCard` | `components/SectionCard.tsx` | Analyze, Analysis, Profile |
| `ActionCard` | `components/ActionCard.tsx` | Analyze |
| `TipRow` | `components/TipRow.tsx` | Analyze |
| `AnalyzeHeader` | `components/AnalyzeHeader.tsx` | Analyze |
| `HeroHeader` | `components/HeroHeader.tsx` | Legacy / unused on Analyze |
| `ScoreRing` | `components/ScoreRing.tsx` | Analysis, History |
| `SubScoreCard` | `components/SubScoreCard.tsx` | Analysis |
| `DeltaPill` | `components/DeltaPill.tsx` | Analysis |
| `DrillStep` | `components/DrillStep.tsx` | Analysis |
| `StatDisplay` | `components/StatDisplay.tsx` | Analysis |
| `FeedbackRow` | `components/FeedbackRow.tsx` | Analysis |
| `SwingListItem` | `components/SwingListItem.tsx` | History |
| `TrendBadge` | `components/TrendBadge.tsx` | History |
| `DeleteButton` | `components/DeleteButton.tsx` | History |
| `EmptyState` | `components/EmptyState.tsx` | History |
| `AvatarCircle` | `components/AvatarCircle.tsx` | Profile |
| `ProfileHeader` | `components/ProfileHeader.tsx` | Profile |
| `DataRow` | `components/DataRow.tsx` | Profile |
| `EditButton` | `components/EditButton.tsx` | Profile |
| `SubscriptionCard` | `components/SubscriptionCard.tsx` | Profile |

---

## Cursor session opener

Paste this at the start of every Cursor session:

```
Read @DESIGN_SYSTEM.md and @tokens.ts before writing any code.
Rules:
- All colors from colors object in tokens.ts — no hardcoded hex
- All spacing from spacing object in tokens.ts — no magic numbers
- All radius values from radius object in tokens.ts
- Display numbers (scores, stats, CTA labels): typography.display (Bebas Neue); screen title headers: typography.displayTitle (Righteous)
- All other text: typography.body (Inter)
- Cards use colors.bg.surface (#161616), radius.card (14px), spacing.card (16px) padding
- ScoreRing uses SVG stroke-dasharray only — no third-party progress libraries
- TabSwitcher active state: colors.bg.gold fill + #000 text (no border-only active states)
- Wordmark is always ALL-CAPS. SWING in white, SENSE in colors.text.gold
- BottomTabBar does not appear on SplashScreen or AuthScreen
```

---

## What to do when Cursor drifts off-brand

```
This doesn't match the design system. Fix:
1. Replace hardcoded colors with imports from tokens.ts colors object
2. Display numerics and CTAs use typography.display (Bebas Neue) — not Inter or system font. Screen title headers use typography.displayTitle (Righteous) — see Typography table.
3. Card background is colors.bg.surface (#161616) — not white or default
4. Border radius must use radius.card (14) token — not arbitrary values
5. ScoreRing must use SVG strokeDasharray — remove any progress bar library
6. Active tab must use colors.bg.gold fill — not a border
```
