# Pull Request

## Description
<!-- Provide a clear and concise description of your changes -->



## Type of Change
<!-- Mark the relevant option with an 'x' -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] **Map System work** (Phase 1-8 implementation)

## Related Issues
<!-- Link to any related issues using #issue_number -->



## Changes Made
<!-- List the main changes in this PR -->

-
-
-

---

## 🗺️ Map Icon Compliance Checklist

**REQUIRED for all PRs that touch map-related code**

This checklist ensures strict icon governance as defined in the BIKO Map System handover document.

### Icon Usage
- [ ] **No direct imports from `lucide-react`** (use `iconMap` from `@/map/icons/iconMap`)
- [ ] All icons sourced from canonical `iconMap.ts`
- [ ] No new icon sets introduced (lucide-react only)
- [ ] Icon used matches canonical entity type (facility → Hospital, vehicle → Truck, etc.)

### Icon Governance Rules
- [ ] **Icons encode entity class only** (not state/risk/priority)
- [ ] **No icon color changes** based on status
- [ ] **Icons always used inside marker containers** (never standalone)
- [ ] State/risk encoded via marker container color (not icon)

### Zoom & Visibility
- [ ] Zoom rules respected (< Z1: clusters only, Z1-Z2: icons, >= Z2: labels)
- [ ] Icons not visible at all zoom levels (proper zoom breakpoints)
- [ ] Clustering implemented for high-density scenarios

### Sprite Compliance (if applicable)
- [ ] Sprite names follow convention: `{domain}.{entity}.{variant}`
- [ ] Sprites regenerated if iconMap.ts changed (`npm run generate:sprites`)
- [ ] No manual sprite file edits

### MapLibre Migration (if applicable)
- [ ] No new Leaflet dependencies added
- [ ] No usage of deprecated `mapIcons.ts` (use `iconMap.ts` instead)
- [ ] MapLibre layers use sprites (not DOM markers for high density)
- [ ] Feature flag respected if touching map pages

### Code Quality
- [ ] ESLint passes (icon governance rules enforced)
- [ ] TypeScript types correct
- [ ] No console errors or warnings

---

## Testing Checklist

- [ ] Tested locally
- [ ] Tested on mobile/responsive
- [ ] Tested with slow network (if map-related)
- [ ] Tested offline mode (if PWA-related)
- [ ] Cross-browser tested (Chrome, Safari, Firefox)

## Screenshots / Videos
<!-- Add screenshots or screen recordings if applicable -->



## Additional Notes
<!-- Any additional information that reviewers should know -->



---

## Reviewer Notes

**For reviewers: Reject PRs that violate icon governance**

Red flags:
- ❌ Multiple icons for same entity type
- ❌ Icons changing color independently of marker
- ❌ Icons without marker containers
- ❌ Icons visible at cluster zoom levels
- ❌ New icon libraries added
- ❌ Direct `lucide-react` imports
- ❌ Usage of deprecated `mapIcons.ts`

**If any red flags are present, request changes immediately.**
