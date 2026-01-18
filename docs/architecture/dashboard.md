---
order: 1
---

# Dashboard Component Architecture

This document describes the component architecture for the OpsKnight dashboard, introduced during the UI refactoring initiative.

## Overview

The dashboard has been refactored from a single large `page.tsx` file (~1400 lines) into a modular component architecture (~950 lines), improving maintainability and reusability.

## Component Structure

```
src/components/dashboard/
├── DashboardCommandCenter.tsx    # Hero section with metrics grid
├── MetricCard.tsx                # Individual metric display
├── QuickActionsPanel.tsx         # User greeting + action buttons
├── OnCallWidget.tsx              # On-call shifts display
├── SidebarWidget.tsx             # Generic sidebar wrapper
├── Dashboard.module.css          # Scoped CSS styles
```

## Component Descriptions

### DashboardCommandCenter

The main hero section at the top of the dashboard.

**Props:**

- `systemStatus` - Current system status object
- `allOpenIncidentsCount` - Count of open incidents
- `totalInRange` - Total incidents in date range
- `metricsOpenCount`, `metricsResolvedCount` - Status counts
- `unassignedCount` - Unassigned incident count
- `rangeLabel` - Human-readable date range
- `incidents`, `filters` - For export functionality
- `currentPeriodAcknowledged` - Acknowledged count

### MetricCard

Reusable card for displaying a single metric.

**Props:**

- `label` - Metric label (e.g., "TOTAL")
- `value` - Numeric value
- `rangeLabel` - Date range indicator

### QuickActionsPanel

Displays greeting and quick action buttons.

**Props:**

- `greeting` - Time-based greeting
- `userName` - Current user's name

### OnCallWidget

Shows currently active on-call shifts.

**Props:**

- `activeShifts` - Array of shift objects with user and schedule info

### SidebarWidget

Generic wrapper for consistent sidebar widget styling.

**Props:**

- `title` - Widget header text
- `icon` - SVG icon element
- `iconBg` - Background gradient (use `WIDGET_ICON_BG` presets)
- `children` - Widget content

**Icon Presets:**

```tsx
import SidebarWidget, {
  WIDGET_ICON_BG,
  WIDGET_ICON_COLOR,
} from '@/components/dashboard/SidebarWidget';

// Available colors: green, blue, orange, purple, red
<SidebarWidget
  title="My Widget"
  iconBg={WIDGET_ICON_BG.green}
  icon={<MyIcon stroke={WIDGET_ICON_COLOR.green} />}
>
  {content}
</SidebarWidget>;
```

## Utility Functions

Located in `src/lib/dashboard-utils.ts`:

| Function                 | Description                        |
| ------------------------ | ---------------------------------- |
| `buildDateFilter()`      | Creates Prisma date range filter   |
| `buildIncidentWhere()`   | Builds typed Prisma where clause   |
| `buildIncidentOrderBy()` | Creates typed orderBy clause       |
| `getDaysFromRange()`     | Parses range string to days        |
| `getRangeLabel()`        | Returns human-readable range label |

All functions use proper Prisma types for type safety.

## CSS Architecture

### CSS Modules

- `Dashboard.module.css` - Dashboard-specific styles
- `IncidentTable.module.css` - Table-specific styles

### Global Styles

- `globals.css` - Base styles, variables, and shared utilities
- Classes like `glass-panel`, `glass-button` are defined globally

## Adding New Widgets

To add a new sidebar widget:

```tsx
import SidebarWidget, {
  WIDGET_ICON_BG,
  WIDGET_ICON_COLOR,
} from '@/components/dashboard/SidebarWidget';

<SidebarWidget
  title="New Widget"
  iconBg={WIDGET_ICON_BG.purple}
  icon={
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={WIDGET_ICON_COLOR.purple}
      strokeWidth="2"
    >
      <path d="..." />
    </svg>
  }
>
  <YourWidgetContent />
</SidebarWidget>;
```

## Testing

Unit tests for dashboard utilities are located in:

- `tests/unit/dashboard-utils.test.ts` (22 tests)
