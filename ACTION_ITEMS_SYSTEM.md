# Action Items Management System

## Overview

The Action Items system provides a comprehensive dashboard and board view to track, manage, and monitor all action items created from postmortems. This ensures that follow-up tasks from incident postmortems are properly tracked and completed.

## Features

### 1. Action Items Dashboard (`/action-items`)

#### Statistics Overview
- **Total Action Items**: Count of all action items across all postmortems
- **Open**: Items that haven't been started
- **In Progress**: Items currently being worked on
- **Completed**: Finished items
- **Blocked**: Items that are blocked
- **Overdue**: Items past their due date (highlighted in red)
- **High Priority**: High priority items that aren't completed

#### Views

**Board View (Kanban)**
- 4 columns: Open, In Progress, Completed, Blocked
- Drag-and-drop ready (can be enhanced)
- Visual cards with:
  - Priority badges
  - Status indicators
  - Owner information
  - Due dates
  - Overdue warnings
  - Links to postmortem and incident

**List View**
- Detailed list of all action items
- Sortable and filterable
- Shows full context (postmortem, incident, service)
- Click to navigate to postmortem

#### Filters
- **Status**: Filter by Open, In Progress, Completed, Blocked
- **Owner**: Filter by assigned user
- **Priority**: Filter by High, Medium, Low
- Filters can be combined

### 2. Dashboard Widget

A widget on the main dashboard (`/`) shows:
- Quick stats (Open, In Progress, Completed, Overdue)
- Completion rate progress bar
- Recent action items (top 5)
- Quick link to full dashboard

### 3. Integration with Postmortems

- Action items are created and managed within postmortems
- All action items are automatically aggregated in the dashboard
- Each action item links back to its postmortem and incident
- Status updates in postmortems reflect in the dashboard

## Data Structure

Action items are stored as JSON in the Postmortem model:

```typescript
{
  id: string;
  title: string;
  description: string;
  owner?: string; // User ID
  dueDate?: string; // ISO date string
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

## Navigation

### Sidebar
- Added "Action Items" link in INSIGHTS section
- Icon: Checklist/clipboard icon

### Quick Access
- Dashboard widget for quick overview
- Direct links from postmortem pages
- Links from incident pages (if postmortem exists)

## User Experience

### Visual Indicators
- **Color-coded statuses**: Blue (Open), Orange (In Progress), Green (Completed), Red (Blocked)
- **Priority badges**: High (Red), Medium (Orange), Low (Gray)
- **Overdue warnings**: Red badges and highlighting
- **Progress tracking**: Visual progress bars

### Interactions
- Click on action item card → Navigate to postmortem
- Click on stats → Filter by that status
- Hover effects for better UX
- Responsive design for mobile/desktop

## Future Enhancements

### Phase 1 (Current)
- ✅ Dashboard page with board/list views
- ✅ Statistics and filtering
- ✅ Dashboard widget
- ✅ Sidebar integration

### Phase 2 (Recommended)
- [ ] Drag-and-drop status updates in board view
- [ ] Bulk status updates
- [ ] Email notifications for overdue items
- [ ] Due date reminders
- [ ] Action item comments/notes
- [ ] Assignment notifications

### Phase 3 (Advanced)
- [ ] Action item templates
- [ ] Recurring action items
- [ ] Dependencies between action items
- [ ] Time tracking
- [ ] Reports and analytics
- [ ] Integration with external task management tools

## Files Created

1. **`src/app/(app)/action-items/page.tsx`**
   - Main action items dashboard page
   - Fetches all postmortems and extracts action items
   - Applies filters and renders board/list view

2. **`src/components/action-items/ActionItemsStats.tsx`**
   - Statistics cards component
   - Clickable cards that filter by status/priority
   - Highlights overdue and high-priority items

3. **`src/components/action-items/ActionItemsBoard.tsx`**
   - Kanban board view
   - List view
   - Filtering controls
   - Action item cards

4. **`src/components/DashboardActionItems.tsx`**
   - Dashboard widget component
   - Quick stats and recent items
   - Links to full dashboard

5. **Updated `src/components/Sidebar.tsx`**
   - Added Action Items navigation link

## Usage

### For Users
1. Navigate to **Action Items** from sidebar
2. View all action items in board or list format
3. Filter by status, owner, or priority
4. Click on any item to view the full postmortem
5. Track progress with statistics and completion rates

### For Managers
1. Monitor completion rates
2. Identify overdue items
3. Track high-priority items
4. View items by owner for workload management
5. Use dashboard widget for quick overview

## Benefits

1. **Visibility**: All action items in one place
2. **Accountability**: Clear ownership and due dates
3. **Tracking**: Progress monitoring and completion rates
4. **Prioritization**: High-priority items highlighted
5. **Context**: Links back to postmortems and incidents
6. **Efficiency**: Quick filtering and navigation

## Conclusion

The Action Items system provides a comprehensive solution for tracking and managing follow-up tasks from postmortems. It ensures that lessons learned from incidents result in actionable improvements that are properly tracked and completed.

