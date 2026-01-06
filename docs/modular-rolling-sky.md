# CSS Decoupling Plan for OpsSentinal

## Executive Summary

**Problem:** The `globals.css` file is 354KB (17,490 lines) - a massive monolithic file containing everything from CSS variables to component-specific styles.

**Goal:** Refactor into a modular, maintainable CSS architecture following industry best practices.

---

## Current CSS Structure Diagram

```
OpsSentinal/
├── src/
│   ├── app/
│   │   ├── globals.css (354KB, 17,490 lines) ⚠️ CRITICAL ISSUE
│   │   │   ├── Font imports
│   │   │   ├── CSS Custom Properties (:root)
│   │   │   ├── Dark theme overrides
│   │   │   ├── Base styles
│   │   │   ├── Utility classes
│   │   │   ├── Component styles (50+ components)
│   │   │   ├── Layout styles
│   │   │   └── Animations
│   │   │
│   │   ├── layout.tsx (imports globals.css)
│   │   │
│   │   ├── (app)/
│   │   │   ├── page.module.css
│   │   │   └── analytics/
│   │   │       └── analytics-v2.css (104KB, 4,153 lines) ⚠️
│   │   │
│   │   └── (mobile)/
│   │       └── m/
│   │           ├── mobile.css (64KB, 2,927 lines) ⚠️
│   │           └── mobile-premium.css
│   │
│   └── components/
│       ├── dashboard/
│       │   └── Dashboard.module.css (8KB)
│       ├── incidents/
│       │   └── IncidentTable.module.css (6.6KB)
│       └── settings/
│           ├── NotificationProviderTabs.css
│           └── SettingsPageHeader.css
│
└── public/
    └── status-page-templates/
        └── [80+ themed CSS files] ⚠️
```

### Key Issues Identified

1. **globals.css is 354KB** - Contains everything mixed together
2. **No separation of concerns** - Variables, base styles, components all in one file
3. **Inconsistent patterns** - Mix of global CSS, CSS modules, and page-specific CSS
4. **No build optimization** - No PostCSS, no purging, no minification
5. **Duplicate styles** - Status page templates have redundant code
6. **Maintenance nightmare** - Hard to find and update specific styles

---

## Proposed Decoupled Structure Diagram

```
OpsSentinal/
├── src/
│   ├── styles/
│   │   ├── index.css (Main entry point - imports all core styles)
│   │   │
│   │   ├── foundation/
│   │   │   ├── fonts.css (Font imports)
│   │   │   ├── variables.css (CSS custom properties)
│   │   │   ├── variables-dark.css (Dark theme variables)
│   │   │   ├── reset.css (CSS reset/normalize)
│   │   │   └── base.css (Base HTML element styles)
│   │   │
│   │   ├── utilities/
│   │   │   ├── spacing.css (Margin/padding utilities)
│   │   │   ├── typography.css (Text utilities)
│   │   │   ├── colors.css (Color utilities)
│   │   │   ├── layout.css (Flex/grid utilities)
│   │   │   ├── effects.css (Glass morphism, shadows)
│   │   │   └── animations.css (Keyframes, transitions)
│   │   │
│   │   ├── layouts/
│   │   │   ├── sidebar.css (Sidebar navigation)
│   │   │   ├── topbar.css (Top navigation)
│   │   │   ├── main-layout.css (Page layouts)
│   │   │   └── responsive.css (Responsive utilities)
│   │   │
│   │   ├── components/
│   │   │   ├── buttons.css
│   │   │   ├── badges.css
│   │   │   ├── cards.css
│   │   │   ├── forms.css
│   │   │   ├── modals.css
│   │   │   ├── tables.css
│   │   │   ├── dropdowns.css
│   │   │   ├── tooltips.css
│   │   │   ├── skeletons.css
│   │   │   ├── user-menu.css
│   │   │   ├── dashboard-widgets.css
│   │   │   ├── status-badges.css
│   │   │   └── [other shared components]
│   │   │
│   │   └── pages/
│   │       ├── analytics.css (Analytics page styles)
│   │       ├── mobile.css (Mobile PWA styles)
│   │       └── mobile-premium.css
│   │
│   ├── app/
│   │   ├── layout.tsx (imports @/styles/index.css)
│   │   │
│   │   └── (app)/
│   │       └── analytics/
│   │           └── page.tsx (imports @/styles/pages/analytics.css)
│   │
│   └── components/
│       ├── dashboard/
│       │   ├── Dashboard.tsx
│       │   └── Dashboard.module.css (Component-specific overrides)
│       │
│       └── [other components with .module.css as needed]
│
├── public/
│   └── themes/
│       ├── status-page/
│       │   ├── base.css (Shared template base)
│       │   └── themes.css (All themes in one file with CSS variables)
│       └── [consolidated theme files]
│
└── postcss.config.js (NEW - for optimization)
```

---

## Decoupling Strategy

### Phase 1: Setup & Foundation (Priority: HIGH)

**Objective:** Create the new structure and move CSS variables

**Steps:**

1. **Create directory structure**

   ```bash
   mkdir -p src/styles/foundation
   mkdir -p src/styles/utilities
   mkdir -p src/styles/layouts
   mkdir -p src/styles/components
   mkdir -p src/styles/pages
   ```

2. **Extract CSS Variables** (from globals.css → foundation/)

   **Create `src/styles/foundation/fonts.css`:**
   - Move Google Fonts import
   - Estimated: 5 lines

   **Create `src/styles/foundation/variables.css`:**
   - Move all `:root { }` variables
   - Color system
   - Border radius scale
   - Shadow system
   - Spacing scale
   - Typography scale
   - Font weights, line heights
   - Transitions
   - Breakpoints
   - Z-index scale
   - Gradients
   - Badge colors
   - Layout variables
   - Estimated: 400-500 lines

   **Create `src/styles/foundation/variables-dark.css`:**
   - Move all `[data-theme='dark'] { }` overrides
   - Estimated: 100-150 lines

   **Create `src/styles/foundation/reset.css`:**
   - Move CSS reset rules
   - Box sizing, margin reset
   - Estimated: 50 lines

   **Create `src/styles/foundation/base.css`:**
   - Move base HTML element styles
   - html, body, main
   - Default typography
   - Scroll behavior
   - Estimated: 100 lines

3. **Create Main Entry Point**

   **Create `src/styles/index.css`:**

   ```css
   /* Foundation Layer - Load first */
   @import './foundation/fonts.css';
   @import './foundation/variables.css';
   @import './foundation/variables-dark.css';
   @import './foundation/reset.css';
   @import './foundation/base.css';

   /* Utilities Layer */
   @import './utilities/spacing.css';
   @import './utilities/typography.css';
   @import './utilities/colors.css';
   @import './utilities/layout.css';
   @import './utilities/effects.css';
   @import './utilities/animations.css';

   /* Layouts Layer */
   @import './layouts/sidebar.css';
   @import './layouts/topbar.css';
   @import './layouts/main-layout.css';
   @import './layouts/responsive.css';

   /* Components Layer */
   @import './components/buttons.css';
   @import './components/badges.css';
   @import './components/cards.css';
   @import './components/forms.css';
   @import './components/modals.css';
   @import './components/tables.css';
   @import './components/dropdowns.css';
   @import './components/tooltips.css';
   @import './components/skeletons.css';
   @import './components/user-menu.css';
   @import './components/dashboard-widgets.css';
   @import './components/status-badges.css';
   /* Add more as you split */
   ```

4. **Update Root Layout**

   **Edit `src/app/layout.tsx`:**

   ```typescript
   // Change from:
   import './globals.css';

   // To:
   import '@/styles/index.css';
   ```

### Phase 2: Extract Utilities (Priority: HIGH)

**Objective:** Move utility classes out of globals.css

**Steps:**

1. **Create `src/styles/utilities/effects.css`:**
   - Glass morphism classes (.glass-card, .glass-panel, etc.)
   - Shadow utilities
   - Backdrop filters
   - Estimated: 200 lines

2. **Create `src/styles/utilities/animations.css`:**
   - All @keyframes rules
   - Animation utilities
   - Micro-animations
   - Transition utilities
   - Estimated: 300 lines

3. **Create `src/styles/utilities/spacing.css`:**
   - Margin/padding utilities (if any)
   - Gap utilities
   - Estimated: 50 lines

4. **Create `src/styles/utilities/typography.css`:**
   - Text utilities (if any beyond variables)
   - Font size classes
   - Estimated: 50 lines

5. **Create `src/styles/utilities/colors.css`:**
   - Color utility classes (if any)
   - Background colors
   - Estimated: 50 lines

6. **Create `src/styles/utilities/layout.css`:**
   - Flexbox utilities
   - Grid utilities
   - Container utilities
   - Estimated: 100 lines

### Phase 3: Extract Layouts (Priority: MEDIUM)

**Objective:** Move layout-specific styles

**Steps:**

1. **Create `src/styles/layouts/sidebar.css`:**
   - All `.sidebar` styles
   - Sidebar navigation
   - Sidebar items
   - Sidebar animations
   - Estimated: 500-800 lines

2. **Create `src/styles/layouts/topbar.css`:**
   - All `.topbar` styles
   - Top navigation
   - Estimated: 300 lines

3. **Create `src/styles/layouts/main-layout.css`:**
   - Main container
   - Content area
   - Page wrapper
   - Estimated: 200 lines

4. **Create `src/styles/layouts/responsive.css`:**
   - Media queries
   - Responsive utilities
   - Breakpoint-specific styles
   - Estimated: 200 lines

### Phase 4: Extract Components (Priority: MEDIUM)

**Objective:** Move component styles from globals.css

**Steps:**

1. **Identify all component sections in globals.css:**
   - Look for comment sections like `/* Component Name */`
   - Buttons, badges, cards, forms, modals, etc.

2. **Create individual component files:**

   **`src/styles/components/buttons.css`:**
   - All button styles
   - Button variants
   - Button states
   - Estimated: 300 lines

   **`src/styles/components/badges.css`:**
   - Badge styles
   - Status badges
   - Badge variants
   - Estimated: 200 lines

   **`src/styles/components/cards.css`:**
   - Card containers
   - Card headers/footers
   - Card variants
   - Estimated: 200 lines

   **`src/styles/components/forms.css`:**
   - Form inputs
   - Form groups
   - Form validation
   - Login/auth forms
   - Estimated: 400-600 lines

   **`src/styles/components/modals.css`:**
   - Modal overlays
   - Modal content
   - Modal animations
   - Estimated: 200 lines

   **`src/styles/components/tables.css`:**
   - Table styles
   - Table rows/cells
   - Table sorting
   - Estimated: 300 lines

   **`src/styles/components/dropdowns.css`:**
   - Dropdown menus
   - Dropdown items
   - Dropdown animations
   - Estimated: 200 lines

   **`src/styles/components/user-menu.css`:**
   - User menu specific styles
   - Estimated: 200 lines

   **`src/styles/components/dashboard-widgets.css`:**
   - Dashboard widget styles
   - Widget variants
   - Estimated: 400 lines

   **`src/styles/components/status-badges.css`:**
   - Status indicators
   - Status colors
   - Estimated: 150 lines

   **`src/styles/components/skeletons.css`:**
   - Skeleton loaders
   - Loading animations
   - Estimated: 150 lines

   **Continue for all other components found in globals.css**

### Phase 5: Move Page-Specific Styles (Priority: LOW)

**Objective:** Organize large page-specific CSS files

**Steps:**

1. **Move analytics styles:**

   ```bash
   mv src/app/(app)/analytics/analytics-v2.css src/styles/pages/analytics.css
   ```

   **Update import in `src/app/(app)/analytics/page.tsx`:**

   ```typescript
   // Change from:
   import './analytics-v2.css';

   // To:
   import '@/styles/pages/analytics.css';
   ```

2. **Move mobile styles:**

   ```bash
   mv src/app/(mobile)/m/mobile.css src/styles/pages/mobile.css
   mv src/app/(mobile)/m/mobile-premium.css src/styles/pages/mobile-premium.css
   ```

   **Update imports in `src/app/(mobile)/m/layout.tsx`:**

   ```typescript
   // Change from:
   import './mobile.css';
   import './mobile-premium.css';

   // To:
   import '@/styles/pages/mobile.css';
   import '@/styles/pages/mobile-premium.css';
   ```

3. **Consider splitting large page files:**
   - If analytics.css (104KB) is still too large:
     - Create `src/styles/pages/analytics/` directory
     - Split into: charts.css, filters.css, tables.css, etc.

   - If mobile.css (64KB) is still too large:
     - Create `src/styles/pages/mobile/` directory
     - Split into: navigation.css, components.css, layouts.css, etc.

### Phase 6: Consolidate Status Page Templates (Priority: LOW)

**Objective:** Reduce 80+ template files to a manageable system

**Current Problem:**

- 80+ individual CSS files in `public/status-page-templates/`
- Each template has similar structure with different color values
- Lots of duplicate code

**Solution: CSS Variables-Based Theme System**

**Steps:**

1. **Create base template:**

   **`public/themes/status-page/base.css`:**

   ```css
   /* Core structure that all themes share */
   .status-page {
     /* Uses CSS variables defined by theme */
     background-color: var(--status-bg);
     color: var(--status-text);
   }

   .status-header {
     background: var(--status-header-bg);
     border-bottom: 1px solid var(--status-border);
   }

   /* ... all shared structural styles */
   ```

2. **Create consolidated themes file:**

   **`public/themes/status-page/themes.css`:**

   ```css
   /* Each theme is now just CSS variables */
   [data-status-theme='amber-slate'] {
     --status-bg: #0f172a;
     --status-text: #f59e0b;
     /* ... all theme colors */
   }

   [data-status-theme='aurora-bright'] {
     --status-bg: #ffffff;
     --status-text: #6366f1;
     /* ... all theme colors */
   }

   /* Repeat for all 80+ themes */
   /* This consolidates 80 files into 1 */
   ```

3. **Update status page implementation:**
   - Load base.css + themes.css
   - Set `data-status-theme` attribute based on user selection
   - Much easier to maintain and extend

### Phase 7: Add Build Optimization (Priority: MEDIUM)

**Objective:** Optimize CSS for production

**Steps:**

1. **Install PostCSS dependencies:**

   ```bash
   npm install -D postcss postcss-import postcss-preset-env cssnano
   ```

2. **Create `postcss.config.js`:**

   ```javascript
   module.exports = {
     plugins: {
       'postcss-import': {},
       'postcss-preset-env': {
         stage: 3,
         features: {
           'nesting-rules': true,
           'custom-properties': false, // Preserve for runtime theming
         },
       },
       ...(process.env.NODE_ENV === 'production'
         ? {
             cssnano: {
               preset: [
                 'default',
                 {
                   discardComments: { removeAll: true },
                   normalizeWhitespace: true,
                 },
               ],
             },
           }
         : {}),
     },
   };
   ```

3. **Benefits:**
   - Minified CSS in production
   - Vendor prefixing
   - CSS nesting support
   - Import inlining

### Phase 8: Cleanup & Testing (Priority: HIGH)

**Objective:** Remove old files and verify everything works

**Steps:**

1. **Verify all imports:**
   - Check all pages still render correctly
   - Check all components still have proper styling
   - Test dark mode switching
   - Test responsive layouts
   - Test mobile PWA

2. **Remove old globals.css:**

   ```bash
   # Only after everything is verified working!
   mv src/app/globals.css src/app/globals.css.backup
   ```

3. **Update any remaining imports:**
   - Search for any files still importing old paths
   - Update to new paths

4. **Run build:**

   ```bash
   npm run build
   ```

   - Verify no CSS errors
   - Check bundle sizes
   - Ensure all styles load correctly

5. **Clean up backups:**
   ```bash
   # Once everything is confirmed working
   rm src/app/globals.css.backup
   ```

---

## File-by-File Extraction Guide

### How to Extract Styles from globals.css

**Process for each new file:**

1. **Open globals.css in editor**
2. **Find the section** (look for comment markers)
3. **Copy the entire section** including comments
4. **Paste into new dedicated file**
5. **Add a comment** at the original location noting where it moved:
   ```css
   /* Sidebar styles moved to src/styles/layouts/sidebar.css */
   ```
6. **Test that styles still work**
7. **Delete the old section** from globals.css
8. **Repeat**

**Example Extraction:**

```css
/* In globals.css, find: */
/* ========================================
   Sidebar Navigation
   ======================================== */
.sidebar {
  /* styles */
}

/* Cut this entire section */

/* Create src/styles/layouts/sidebar.css with: */
/* ========================================
   Sidebar Navigation
   Extracted from globals.css
   ======================================== */
.sidebar {
  /* styles */
}
```

### Section Markers to Look For in globals.css

Based on typical large global CSS files, look for these section comments:

- `/* Custom Properties */` or `/* CSS Variables */`
- `/* Reset */` or `/* Base Styles */`
- `/* Typography */`
- `/* Layout */` or `/* Containers */`
- `/* Sidebar */`
- `/* Topbar */` or `/* Navigation */`
- `/* Buttons */`
- `/* Forms */` or `/* Inputs */`
- `/* Cards */`
- `/* Badges */` or `/* Status */`
- `/* Modals */` or `/* Dialogs */`
- `/* Tables */`
- `/* Dashboard */` or `/* Widgets */`
- `/* Animations */` or `/* Keyframes */`
- `/* Utilities */`
- `/* Responsive */` or `/* Media Queries */`

---

## Critical Files to Modify

### High Priority (Phase 1-2)

1. `src/app/layout.tsx` - Update import path
2. `src/app/globals.css` - Extract variables and utilities
3. `src/styles/index.css` - NEW: Main entry point
4. `src/styles/foundation/*` - NEW: Create all foundation files
5. `src/styles/utilities/*` - NEW: Create all utility files

### Medium Priority (Phase 3-4)

6. `src/styles/layouts/*` - NEW: Create all layout files
7. `src/styles/components/*` - NEW: Create all component files
8. `src/app/(mobile)/m/layout.tsx` - Update import paths

### Low Priority (Phase 5-6)

9. `src/app/(app)/analytics/page.tsx` - Update import path
10. `public/status-page-templates/*` - Consolidate into theme system

---

## Expected Outcomes

### Before Refactor:

- **globals.css:** 354KB, 17,490 lines
- **Structure:** Monolithic, hard to maintain
- **Build time:** Slower (no optimization)
- **Developer experience:** Difficult to find styles

### After Refactor:

- **Largest file:** ~500 lines max per file
- **Structure:** Modular, organized by concern
- **Build time:** Faster with PostCSS optimization
- **Developer experience:** Easy to locate and modify styles
- **Maintainability:** High - clear separation of concerns

### File Size Breakdown (Estimated):

```
src/styles/
├── index.css                    (~50 lines - just imports)
├── foundation/
│   ├── fonts.css                (~5 lines)
│   ├── variables.css            (~500 lines)
│   ├── variables-dark.css       (~150 lines)
│   ├── reset.css                (~50 lines)
│   └── base.css                 (~100 lines)
├── utilities/
│   ├── effects.css              (~200 lines)
│   ├── animations.css           (~300 lines)
│   ├── spacing.css              (~50 lines)
│   ├── typography.css           (~50 lines)
│   ├── colors.css               (~50 lines)
│   └── layout.css               (~100 lines)
├── layouts/
│   ├── sidebar.css              (~800 lines)
│   ├── topbar.css               (~300 lines)
│   ├── main-layout.css          (~200 lines)
│   └── responsive.css           (~200 lines)
└── components/
    ├── buttons.css              (~300 lines)
    ├── badges.css               (~200 lines)
    ├── cards.css                (~200 lines)
    ├── forms.css                (~600 lines)
    ├── modals.css               (~200 lines)
    ├── tables.css               (~300 lines)
    ├── dropdowns.css            (~200 lines)
    ├── tooltips.css             (~150 lines)
    ├── skeletons.css            (~150 lines)
    ├── user-menu.css            (~200 lines)
    ├── dashboard-widgets.css    (~400 lines)
    ├── status-badges.css        (~150 lines)
    └── [~30 more component files] (~200-400 lines each)

Total: ~17,490 lines (same content, better organized)
```

---

## Best Practices Moving Forward

### CSS Organization Rules:

1. **One concern per file** - Don't mix utilities with components
2. **Max 500-800 lines per file** - If larger, split further
3. **Use CSS modules for component overrides** - Keep component-specific in .module.css
4. **Keep CSS variables in foundation** - Single source of truth
5. **Document complex styles** - Add comments explaining "why"
6. **Use consistent naming** - BEM or utility-first approach
7. **Test dark mode** - Always verify theme switching works
8. **Mobile-first** - Write mobile styles first, then enhance

### Naming Conventions:

```css
/* Foundation - CSS Variables */
--color-primary: #value;
--spacing-4: 1rem;

/* Utilities - Single purpose */
.text-center {
}
.glass-card {
}

/* Components - BEM style */
.button {
}
.button--primary {
}
.button--large {
}
.button__icon {
}

/* Layouts - Descriptive */
.sidebar {
}
.main-content {
}
```

---

## Risk Mitigation

### Potential Risks:

1. **Styles break during migration**
   - Mitigation: Extract one section at a time, test immediately
   - Keep globals.css.backup until 100% verified

2. **Import order causes issues**
   - Mitigation: Follow cascade order (foundation → utilities → layouts → components)
   - CSS specificity might need adjustment

3. **Performance regression**
   - Mitigation: Monitor bundle sizes before/after
   - Use PostCSS to optimize production build

4. **Dark mode breaks**
   - Mitigation: Test theme switching after each extraction
   - Keep variables-dark.css separate but imported after variables.css

5. **Responsive styles break**
   - Mitigation: Test on multiple screen sizes
   - Keep media queries organized in responsive.css

---

## Timeline Recommendation

**Suggested Approach: Incremental Migration**

- **Week 1:** Phase 1-2 (Foundation + Utilities) - 8-12 hours
- **Week 2:** Phase 3 (Layouts) - 6-8 hours
- **Week 3-4:** Phase 4 (Components - largest effort) - 16-20 hours
- **Week 5:** Phase 5-6 (Pages + Templates) - 6-8 hours
- **Week 6:** Phase 7-8 (Optimization + Testing) - 4-6 hours

**Total Effort:** 40-54 hours

**Can be done faster if dedicated full-time:** 1-2 weeks

---

## Success Criteria

The refactor is complete when:

- [ ] globals.css is deleted (or <100 lines for legacy compatibility)
- [ ] All styles work identically to before
- [ ] Dark mode works correctly
- [ ] Mobile PWA styles work correctly
- [ ] All pages render correctly
- [ ] Production build succeeds without errors
- [ ] Bundle size is optimized (should be smaller with minification)
- [ ] No CSS-related console errors
- [ ] Team can easily find and modify styles

---

## Questions to Consider

Before starting, confirm:

1. **Do you want to keep CSS Modules for components?** (Recommended: Yes)
2. **Do you want to add PostCSS optimization now or later?** (Recommended: Now)
3. **Should we consolidate status page templates?** (Recommended: Yes, saves maintenance)
4. **Do you want to split large page CSS files further?** (Recommended: Yes for analytics.css)
5. **Any specific component styles that should stay in .module.css?** (Recommend: scoped overrides only)

---

## Next Steps

1. **Review this plan** - Make sure you agree with the structure
2. **Answer questions above** - Clarify any preferences
3. **Start with Phase 1** - Create foundation files (lowest risk, highest impact)
4. **Test frequently** - Don't extract everything at once
5. **Commit incrementally** - Small commits make rollback easier

Ready to proceed? Let's start with Phase 1!
