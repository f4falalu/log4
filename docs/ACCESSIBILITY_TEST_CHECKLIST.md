# BIKO Accessibility Testing Checklist

**Purpose**: Comprehensive checklist for manual and automated accessibility testing
**Standard**: WCAG 2.1 Level AA
**Last Updated**: December 10, 2025

---

## Quick Start

### Before Testing
- [ ] Build passes without errors (`npm run build`)
- [ ] TypeScript has 0 errors (`npm run type-check`)
- [ ] Application runs locally (`npm run dev`)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)

### Testing Order
1. Automated tools (axe DevTools, Lighthouse)
2. Keyboard navigation
3. Screen reader testing
4. Visual/zoom testing
5. Motion testing

---

## 1. Automated Testing

### 1.1 axe DevTools (Browser Extension)

**Install**: [Chrome](https://chrome.google.com/webstore/detail/axe-devtools/lhdoppojpmngadmnindnejefpokejbdd) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/)

**Test Each Page**:
- [ ] Dashboard (`/`)
- [ ] Tactical Map (`/tactical-map`)
- [ ] Vehicle Management (`/fleetops/vlms/vehicles`)
- [ ] Vehicle Details (`/fleetops/vlms/vehicles/[id]`)
- [ ] Driver Management (`/fleetops/drivers`)
- [ ] Fleet Management (`/fleetops/fleet-management`)
- [ ] Requisitions (`/storefront/requisitions`)
- [ ] Facilities (`/storefront/facilities`)
- [ ] Scheduler (`/storefront/scheduler`)
- [ ] LGAs (`/storefront/lgas`)

**Steps**:
1. Open page in browser
2. Open DevTools (F12)
3. Go to "axe DevTools" tab
4. Click "Scan ALL of my page"
5. Review issues (Critical, Serious, Moderate, Minor)
6. Document issues in [ACCESSIBILITY_ISSUES.md](#)

**Target**: 0 Critical, 0 Serious issues

---

### 1.2 Lighthouse (Chrome DevTools)

**Test Each Page**:
- [ ] Desktop mode (all pages listed above)
- [ ] Mobile mode (all pages listed above)

**Steps**:
1. Open page in Chrome
2. Open DevTools (F12)
3. Go to "Lighthouse" tab
4. Select "Accessibility" category
5. Select "Desktop" or "Mobile"
6. Click "Analyze page load"
7. Review score and issues

**Target**: 95+ Accessibility Score

**Command Line** (optional):
```bash
npm install -g lighthouse
lighthouse http://localhost:5173 --only-categories=accessibility --view
```

---

### 1.3 Pa11y (CLI Tool)

**Install**:
```bash
npm install -g pa11y
```

**Test**:
```bash
# Single page
pa11y http://localhost:5173

# Multiple pages
pa11y http://localhost:5173
pa11y http://localhost:5173/tactical-map
pa11y http://localhost:5173/fleetops/vlms/vehicles

# With axe-core runner
pa11y http://localhost:5173 --runner axe

# Generate report
pa11y http://localhost:5173 --reporter html > pa11y-report.html
```

**Target**: 0 errors, 0 warnings

---

### 1.4 WAVE Browser Extension

**Install**: [Chrome/Firefox](https://wave.webaim.org/extension/)

**Test Each Page**:
- [ ] Dashboard
- [ ] Tactical Map
- [ ] Vehicle Management
- [ ] Driver Management

**Steps**:
1. Open page in browser
2. Click WAVE extension icon
3. Review "Errors" tab (red icons)
4. Review "Contrast Errors" tab
5. Review "Alerts" tab (yellow icons)

**Target**: 0 Errors, 0 Contrast Errors

---

## 2. Keyboard Navigation Testing

### 2.1 Tab Navigation

**Test Without Mouse**:
- [ ] Unplug mouse or hide cursor
- [ ] Use only Tab, Shift+Tab, Enter, Space, Arrow keys, Esc

**Test All Pages**:
- [ ] Dashboard
- [ ] Tactical Map
- [ ] Vehicle Management
- [ ] Vehicle Details
- [ ] Driver Management
- [ ] Requisitions
- [ ] Facilities

**Checklist Per Page**:

#### General Navigation
- [ ] Tab order is logical (left-to-right, top-to-bottom)
- [ ] Focus indicator visible on all interactive elements
- [ ] Focus indicator has 3:1 contrast with background
- [ ] No focus jumps or unexpected focus changes
- [ ] Skip links work (if present)

#### Buttons and Links
- [ ] All buttons focusable with Tab
- [ ] Enter/Space activates buttons
- [ ] All links focusable with Tab
- [ ] Enter activates links
- [ ] Icon-only buttons announce purpose (test with screen reader)

#### Forms
- [ ] All form fields focusable with Tab
- [ ] Tab order follows visual order
- [ ] Labels associated with inputs (click label focuses input)
- [ ] Required fields indicated clearly
- [ ] Error messages announced (test with screen reader)
- [ ] Form submission works with Enter key

#### Modals and Dialogs
- [ ] Modal opens with Enter/Space on trigger button
- [ ] Focus moves to modal on open
- [ ] Tab cycles within modal (no escape to page behind)
- [ ] Esc key closes modal
- [ ] Focus returns to trigger on close
- [ ] Background content inert while modal open

#### Dropdowns and Menus
- [ ] Dropdown opens with Enter/Space
- [ ] Arrow keys navigate dropdown items
- [ ] Enter selects item
- [ ] Esc closes dropdown
- [ ] Focus returns to trigger on close

#### Tables
- [ ] Headers announced by screen reader
- [ ] Row selection works with keyboard
- [ ] Table navigation logical (left-to-right, row-by-row)

---

### 2.2 Keyboard Shortcuts

**Document All Shortcuts**:
- [ ] Shortcuts documented in UI or help section
- [ ] Shortcuts don't conflict with browser/OS shortcuts
- [ ] Shortcuts can be disabled if needed

**Example**:
- `Ctrl/Cmd + K`: Open command palette
- `Esc`: Close modal/drawer
- `/`: Focus search input

---

## 3. Screen Reader Testing

### 3.1 Windows - NVDA + Chrome

**Install**: [NVDA (Free)](https://www.nvaccess.org/)

**Test Each Page**:
- [ ] Dashboard
- [ ] Tactical Map
- [ ] Vehicle Management
- [ ] Driver Management

**Checklist**:

#### Page Structure
- [ ] Page title announced on load
- [ ] Landmark regions announced (header, nav, main, footer)
- [ ] Headings hierarchy announced (H1, H2, H3)
- [ ] Headings describe content accurately

#### Navigation
- [ ] Insert + F7: Elements list shows all headings
- [ ] H/Shift+H: Navigate by headings
- [ ] D/Shift+D: Navigate by landmarks
- [ ] K/Shift+K: Navigate by links
- [ ] B/Shift+B: Navigate by buttons

#### Interactive Elements
- [ ] Button role and label announced
- [ ] Link role and destination announced
- [ ] Form field label and role announced
- [ ] Checkbox/radio state announced (checked/unchecked)
- [ ] Dropdown expanded state announced (collapsed/expanded)
- [ ] Current value announced for selects/combos

#### Dynamic Content
- [ ] Loading states announced (`aria-live="polite"`)
- [ ] Error messages announced (`role="alert"`)
- [ ] Success messages announced
- [ ] Page updates announced (new items added to list)

#### Tables
- [ ] Table role announced
- [ ] Column headers announced
- [ ] Row headers announced
- [ ] Cell position announced (row X, column Y)

**Commands**:
```
NVDA + Space: Toggle browse/focus mode
Insert + F7: Elements list
H: Next heading
K: Next link
B: Next button
F: Next form field
T: Next table
```

---

### 3.2 macOS - VoiceOver + Safari

**Enable**: System Preferences > Accessibility > VoiceOver

**Test Each Page**:
- [ ] Dashboard
- [ ] Tactical Map
- [ ] Vehicle Management
- [ ] Driver Management

**Checklist**: Same as NVDA (see 3.1)

**Commands**:
```
Cmd + F5: Toggle VoiceOver
VO + A: Start reading
VO + Right Arrow: Next item
VO + Cmd + H: Next heading
VO + Cmd + L: Next link
VO + Cmd + J: Next form control
```

(VO = Ctrl + Option)

---

### 3.3 iOS - VoiceOver + Safari

**Enable**: Settings > Accessibility > VoiceOver

**Test Mobile Views**:
- [ ] Dashboard (mobile)
- [ ] Tactical Map (mobile)
- [ ] Vehicle Management (mobile)

**Checklist**:
- [ ] Swipe right/left navigates elements
- [ ] Double-tap activates buttons/links
- [ ] Three-finger swipe scrolls page
- [ ] Pinch to zoom works (if needed)
- [ ] All interactive elements announced correctly

---

### 3.4 Android - TalkBack + Chrome

**Enable**: Settings > Accessibility > TalkBack

**Test Mobile Views**:
- [ ] Dashboard (mobile)
- [ ] Tactical Map (mobile)
- [ ] Vehicle Management (mobile)

**Checklist**: Same as iOS (see 3.3)

---

## 4. Visual Testing

### 4.1 Zoom Testing

**Test at Multiple Zoom Levels**:
- [ ] 100% (default)
- [ ] 200%
- [ ] 300%
- [ ] 400% (WCAG AA requirement)

**Checklist Per Zoom Level**:
- [ ] Text remains readable (no overlap)
- [ ] No horizontal scrolling (or minimal)
- [ ] Buttons remain clickable (not cut off)
- [ ] Images scale appropriately
- [ ] Layout adapts gracefully
- [ ] No content loss

**Test Pages**:
- [ ] Dashboard
- [ ] Tactical Map
- [ ] Vehicle Management
- [ ] Forms (Vehicle Form, Driver Form)

---

### 4.2 Color Contrast Testing

**Tool**: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**Test Color Combinations**:
- [ ] Primary button (primary bg + white text)
- [ ] Secondary button (secondary bg + text)
- [ ] Success badge (success bg + white text)
- [ ] Warning badge (warning bg + white text)
- [ ] Destructive badge (destructive bg + white text)
- [ ] Info badge (info bg + white text)
- [ ] Body text (foreground + background)
- [ ] Muted text (muted-foreground + background)
- [ ] Link text (primary + background)
- [ ] Error text (destructive + background)

**Target**:
- Normal text: 4.5:1 minimum (WCAG AA)
- Large text (18pt+): 3:1 minimum (WCAG AA)
- UI components: 3:1 minimum (WCAG AA)

**Automated**:
- Use axe DevTools "Contrast" feature
- Use WAVE "Contrast" tab

---

### 4.3 High Contrast Mode (Windows)

**Enable**: Settings > Ease of Access > High Contrast

**Test**:
- [ ] All text readable
- [ ] All buttons visible
- [ ] Focus indicators visible
- [ ] Icons visible
- [ ] Borders visible

**Test Pages**:
- [ ] Dashboard
- [ ] Vehicle Management
- [ ] Forms

---

### 4.4 Dark Mode Testing

**Enable**: Application dark mode toggle

**Test**:
- [ ] All colors inverted correctly
- [ ] Text contrast maintained (4.5:1)
- [ ] Images visible (not too dark)
- [ ] Buttons distinguishable
- [ ] Focus indicators visible

**Test Pages**:
- [ ] Dashboard
- [ ] Tactical Map
- [ ] Vehicle Management

---

## 5. Motion Testing

### 5.1 Reduced Motion

**Enable**:
- **macOS**: System Preferences > Accessibility > Display > Reduce motion
- **Windows**: Settings > Ease of Access > Display > Show animations
- **iOS**: Settings > Accessibility > Motion > Reduce Motion
- **Android**: Settings > Accessibility > Remove animations

**Test**:
- [ ] Animations disabled or reduced to minimal
- [ ] Transitions disabled or reduced to minimal
- [ ] Scroll behavior is instant (not smooth)
- [ ] Loading spinners still visible (but not animated)
- [ ] Page remains functional without animations

**Test Components**:
- [ ] Button hover transitions
- [ ] Modal open/close animations
- [ ] Drawer slide animations
- [ ] Page transitions
- [ ] Loading states (spinner still visible)
- [ ] Alert/toast animations

---

### 5.2 Animation Safety

**Checklist**:
- [ ] No flashing content above 3 flashes per second
- [ ] No parallax scrolling (or minimal)
- [ ] Animations can be paused (if long-running)
- [ ] Auto-playing animations can be stopped

---

## 6. Form Testing

### 6.1 Form Accessibility

**Test All Forms**:
- [ ] Vehicle Form ([src/components/vlms/vehicles/VehicleForm.tsx](../src/components/vlms/vehicles/VehicleForm.tsx))
- [ ] Driver Form
- [ ] Facility Form
- [ ] Requisition Form

**Checklist Per Form**:

#### Labels
- [ ] Every input has a visible label
- [ ] Labels associated with inputs (`htmlFor` + `id`)
- [ ] Labels descriptive (not just "Name")
- [ ] Required fields marked with `*` (and announced)

#### Error Messages
- [ ] Errors displayed when validation fails
- [ ] Errors use semantic color (`text-destructive` not `text-red-500`)
- [ ] Errors announced to screen reader (`role="alert"`)
- [ ] Errors specific (not just "Invalid input")
- [ ] Errors positioned near field

#### Instructions
- [ ] Complex fields have instructions
- [ ] Instructions positioned above/near field
- [ ] Instructions associated with field (`aria-describedby`)

#### Keyboard
- [ ] Tab order logical
- [ ] Enter submits form (if single input)
- [ ] Space checks checkboxes/radios
- [ ] Arrow keys navigate radio groups

#### Screen Reader
- [ ] Field label announced on focus
- [ ] Field type announced (textbox, checkbox, etc.)
- [ ] Required state announced
- [ ] Invalid state announced (if error)
- [ ] Error message announced on validation

---

### 6.2 Form Submission

**Test**:
- [ ] Submit button keyboard accessible
- [ ] Loading state displayed during submission
- [ ] Success message announced (screen reader)
- [ ] Error message announced (screen reader)
- [ ] Focus management after submission (success/error)

---

## 7. Component-Specific Testing

### 7.1 PageLayout

**File**: [src/components/layout/PageLayout.tsx](../src/components/layout/PageLayout.tsx)

**Test**:
- [ ] Title announced as H1 by screen reader
- [ ] Breadcrumbs keyboard navigable
- [ ] Breadcrumbs announce current page
- [ ] Action buttons keyboard accessible
- [ ] Page structure semantic (header, main)

---

### 7.2 EmptyState

**File**: [src/components/ui/empty-state.tsx](../src/components/ui/empty-state.tsx)

**Test**:
- [ ] `role="status"` present
- [ ] Title announced by screen reader
- [ ] Description announced by screen reader
- [ ] Action button keyboard accessible
- [ ] Icon decorative (`aria-hidden="true"`)

---

### 7.3 LoadingState

**File**: [src/components/ui/loading-state.tsx](../src/components/ui/loading-state.tsx)

**Test**:
- [ ] `role="status"` present
- [ ] `aria-live="polite"` present
- [ ] Loading message announced by screen reader
- [ ] Spinner decorative (`aria-hidden="true"`)
- [ ] `sr-only` text present for screen readers

---

### 7.4 PaginationControls

**File**: [src/components/ui/pagination-controls.tsx](../src/components/ui/pagination-controls.tsx)

**Test**:
- [ ] Previous button keyboard accessible
- [ ] Next button keyboard accessible
- [ ] Disabled state announced (aria-disabled)
- [ ] Current page announced by screen reader
- [ ] Page info readable ("Showing 1-50 of 237")

---

### 7.5 Badge

**File**: [src/components/ui/badge.tsx](../src/components/ui/badge.tsx)

**Test**:
- [ ] Badge text readable by screen reader
- [ ] Contrast meets 4.5:1 for all variants
- [ ] Badge role appropriate (default: none)

---

### 7.6 Alert

**File**: [src/components/ui/alert.tsx](../src/components/ui/alert.tsx)

**Test**:
- [ ] Alert role appropriate (`role="alert"` for errors)
- [ ] Alert title announced by screen reader
- [ ] Alert description announced by screen reader
- [ ] Icon decorative (`aria-hidden="true"`)
- [ ] Alert dismissible with keyboard (if applicable)

---

## 8. Mobile Testing

### 8.1 Touch Targets

**Test**:
- [ ] All buttons at least 44x44px (iOS guideline)
- [ ] Buttons have sufficient spacing (8px+ between)
- [ ] Links distinguishable from text (not just color)

**Test Pages**:
- [ ] Dashboard (mobile)
- [ ] Vehicle Management (mobile)
- [ ] Forms (mobile)

---

### 8.2 Mobile Responsiveness

**Test at Breakpoints**:
- [ ] 320px (small phone)
- [ ] 375px (iPhone SE)
- [ ] 414px (iPhone Plus)
- [ ] 768px (tablet)

**Checklist Per Breakpoint**:
- [ ] No horizontal scrolling
- [ ] Text readable (16px+ for body)
- [ ] Buttons tappable (44x44px+)
- [ ] Forms usable (inputs not cut off)
- [ ] Navigation accessible (hamburger menu works)

---

## 9. Browser Compatibility

### 9.1 Desktop Browsers

**Test**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Checklist Per Browser**:
- [ ] Page loads without errors
- [ ] All features functional
- [ ] Focus indicators visible
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly

---

### 9.2 Mobile Browsers

**Test**:
- [ ] Safari (iOS latest)
- [ ] Chrome (iOS latest)
- [ ] Chrome (Android latest)
- [ ] Samsung Internet (Android latest)

**Checklist**: Same as desktop (see 9.1)

---

## 10. Documentation Review

### 10.1 Component Documentation

**Review**:
- [ ] [COMPONENT_LIBRARY.md](./COMPONENT_LIBRARY.md)
- [ ] [COMPONENT_USAGE.md](./COMPONENT_USAGE.md)
- [ ] [DESIGN_TOKENS.md](./DESIGN_TOKENS.md)

**Check**:
- [ ] Accessibility section present
- [ ] ARIA attributes documented
- [ ] Keyboard navigation documented
- [ ] Screen reader behavior documented
- [ ] Examples follow best practices

---

### 10.2 Code Review

**Review**:
- [ ] All new components have ARIA labels
- [ ] All images have alt text
- [ ] All buttons have accessible names
- [ ] All forms have associated labels
- [ ] Colors use semantic tokens (no hardcoded colors)

---

## Issue Tracking Template

Use this template to document issues found during testing:

```markdown
### Issue: [Short description]

**Severity**: Critical | Serious | Moderate | Minor
**WCAG Criterion**: [e.g., 1.4.3 Contrast (Minimum)]
**Page/Component**: [e.g., Vehicle Management page]
**Browser/AT**: [e.g., Chrome + NVDA]

**Description**:
[Detailed description of the issue]

**Steps to Reproduce**:
1. Navigate to...
2. Tab to...
3. Observe...

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Fix**:
[Proposed solution]

**Files Affected**:
- src/path/to/file.tsx
```

---

## Summary Checklist

**Before Launch**:
- [ ] All automated tests pass (axe, Lighthouse, Pa11y)
- [ ] Keyboard navigation tested on all pages
- [ ] Screen reader tested (NVDA or VoiceOver)
- [ ] Zoom testing completed (up to 400%)
- [ ] Color contrast verified (all combinations)
- [ ] Reduced motion tested
- [ ] Forms tested (keyboard + screen reader)
- [ ] Mobile tested (iOS + Android)
- [ ] All browsers tested
- [ ] All critical/serious issues resolved
- [ ] Documentation reviewed and updated

**Target Scores**:
- axe DevTools: 0 Critical, 0 Serious issues
- Lighthouse: 95+ Accessibility Score
- Pa11y: 0 Errors, 0 Warnings
- Manual Testing: 100% checklist completion

---

**Last Updated**: December 10, 2025
**Next Review**: After remediation (January 2026)

---

**End of Accessibility Test Checklist**
