---
name: Top Bar UI Improvements
overview: Fix top bar component positioning issues, replace blue focus outlines with subtle gray, improve spacing/alignment, and enhance responsive behavior.
todos:
  - id: fix-focus-states
    content: Replace blue focus outlines with subtle gray in globals.css (lines 11448-11468)
    status: pending
  - id: fix-alignment
    content: Fix vertical alignment and height consistency for all topbar components
    status: pending
  - id: fix-spacing
    content: Standardize spacing, gaps, and padding across topbar sections
    status: pending
  - id: fix-responsive
    content: Improve responsive behavior and fix overflow issues on smaller screens
    status: pending
  - id: refactor-theme-toggle
    content: Replace ThemeToggle inline styles with CSS classes for consistency
    status: pending
  - id: enhance-hover-states
    content: Improve hover and active states with subtle feedback (no blue colors)
    status: pending
    dependencies:
      - fix-focus-states
---

#Top Bar UI Improvements Plan

## Issues Identified

1. **Blue focus outlines** - Components show blue (`#2563eb`) focus rings when clicked/focused
2. **Positioning issues** - Components not properly aligned vertically, inconsistent spacing
3. **Responsive overflow** - Components overflow on smaller screens
4. **Inconsistent styling** - ThemeToggle uses inline styles, not matching other components

## Files to Modify

- [`src/app/globals.css`](src/app/globals.css) - Fix focus states, positioning, spacing, responsive styles
- [`src/components/ThemeToggle.tsx`](src/components/ThemeToggle.tsx) - Replace inline styles with CSS classes for consistency

## Implementation Details

### 1. Fix Focus States (Remove Blue)

- Replace blue focus outlines (`#2563eb`) with subtle gray (`rgba(15, 23, 42, 0.2)`)
- Update focus-visible styles for all topbar buttons and interactive elements
- Add smooth transitions for focus states

### 2. Fix Component Positioning & Alignment

- Ensure all topbar sections use consistent vertical alignment (`align-items: center`)
- Fix height inconsistencies - standardize component heights to 40px
- Improve gap spacing between components in right section
- Fix breadcrumbs alignment with operational status

### 3. Fix Spacing Issues

- Standardize padding/margins across all topbar components
- Ensure consistent gaps between sections
- Fix border spacing between left/center/right sections

### 4. Fix Responsive Overflow

- Improve mobile breakpoint handling
- Ensure components wrap properly on smaller screens
- Fix search wrapper max-width constraints
- Improve breadcrumbs truncation on mobile

### 5. Enhance ThemeToggle Component

- Replace inline styles with CSS classes
- Match styling with other topbar components
- Ensure proper alignment and spacing