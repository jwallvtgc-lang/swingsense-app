# Design System Compliance Agent

When the user says 'check this component', 'audit this file', 'is this on brand', or 'design system check', or when the user asks you to review a component they just built:

1. Read @design-system/tokens.ts
2. Read @design-system/DESIGN_SYSTEM.md
3. Read the component file being reviewed
4. Run through every check below and report PASS or FAIL for each
5. For every FAIL give the exact line and the exact fix using the correct token

## Checks to run

### Colors
- [ ] No hardcoded hex values anywhere in the file (e.g. '#f0a500', '#161616', '#0a0a0a')
- [ ] All background colors use colors.bg.* from tokens
- [ ] All text colors use colors.text.* from tokens
- [ ] All border colors use colors.border.* from tokens
- [ ] Trend badge colors use colors.bg.trendBetter/Same/Worse and colors.text.trendBetter/Same/Worse

### Typography
- [ ] Score numbers, CTA button labels, display headlines use typography.display (Bebas Neue)
- [ ] All other text uses typography.body (Inter)
- [ ] Font sizes use fontSizes.* from tokens — no hardcoded px values
- [ ] Letter spacing uses letterSpacing.* from tokens

### Spacing
- [ ] No hardcoded padding or margin numbers — all use spacing.* from tokens
- [ ] Screen edge padding uses spacing.screen (20)
- [ ] Card internal padding uses spacing.card (16)
- [ ] Gap between cards uses spacing.cardGap (12)

### Border radius
- [ ] No hardcoded borderRadius values
- [ ] Cards use radius.card (14)
- [ ] Inputs and tab containers use radius.subCard (12)
- [ ] Pills use radius.pill (20)
- [ ] Buttons use radius.card (14)

### Component-specific rules
- [ ] ScoreRing uses SVG Circle with strokeDasharray — no third party progress libraries
- [ ] TabSwitcher active state uses colors.bg.gold fill + #000 text — no border-only active state
- [ ] Wordmark text is ALL-CAPS — never mixed case
- [ ] BottomTabBar is not imported or rendered on SplashScreen or AuthScreen
- [ ] PrimaryButton label uses typography.display font
- [ ] DeltaPill background uses colors.bg.greenDim
- [ ] TrendBadge uses correct trend token colors not hardcoded green/red

### Import hygiene
- [ ] Colors imported from design-system/tokens not from src/config/constants or hardcoded
- [ ] No duplicate token values defined locally that shadow the design system

## Output format

Report like this:

**Design System Compliance Report — [ComponentName]**

✅ PASS — No hardcoded hex colors
❌ FAIL — Line 24: `color: '#f0a500'` → Fix: `color: colors.text.gold`
✅ PASS — Typography uses typography.display for score number
❌ FAIL — Line 31: `borderRadius: 14` → Fix: `borderRadius: radius.card`
✅ PASS — ScoreRing uses SVG strokeDasharray

**Summary: 2 violations found. Fix these before committing.**

## When to run automatically

Run this check automatically whenever you finish generating a new component
or modifying an existing one — without the user having to ask. Just add
'Running design system compliance check...' and show the report at the end
of every component build response.
