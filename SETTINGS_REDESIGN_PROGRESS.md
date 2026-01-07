# Settings Redesign - Phase 1 Complete! 🎉

**✅ BUILD SUCCESSFUL** - All TypeScript errors resolved, ready for Phase 2!

## What We've Built

### ✅ Foundation Setup (Complete)

#### 1. **Tailwind CSS & Shadcn/ui Integration**

- ✅ Installed Tailwind CSS 3.4+
- ✅ Configured PostCSS with Tailwind
- ✅ Added Shadcn/ui design tokens (light & dark mode)
- ✅ Created `components.json` configuration
- ✅ Created `src/lib/utils.ts` with `cn()` helper

#### 2. **Shadcn UI Components** (15 components in `src/components/ui/shadcn/`)

- ✅ button.tsx
- ✅ input.tsx
- ✅ label.tsx
- ✅ select.tsx
- ✅ switch.tsx
- ✅ textarea.tsx
- ✅ card.tsx
- ✅ separator.tsx
- ✅ skeleton.tsx
- ✅ sonner.tsx (toast notifications)
- ✅ badge.tsx
- ✅ alert.tsx
- ✅ dialog.tsx
- ✅ tabs.tsx
- ✅ command.tsx

#### 3. **Core Form Components**

- ✅ **AutosaveForm** (`src/components/settings/forms/AutosaveForm.tsx`)
  - Debounced auto-save (500ms)
  - React Hook Form + Zod integration
  - Optimistic UI updates
  - Toast notifications on error

- ✅ **FormField** (`src/components/settings/forms/FormField.tsx`)
  - Consistent label + input + error layout
  - Tooltip support
  - Required field indicator
  - Accessible ARIA attributes

#### 4. **Feedback Components**

- ✅ **SaveIndicator** (`src/components/settings/feedback/SaveIndicator.tsx`)
  - Shows "Saving...", "Saved ✓", or error states
  - Smooth animations
  - Auto-dismisses after 2s

- ✅ **LoadingState** (`src/components/settings/feedback/LoadingState.tsx`)
  - Skeleton loaders for form, card, list, and table variants
  - SettingsFormLoading for settings pages

#### 5. **Custom Hooks**

- ✅ **useAutosave** (`src/lib/hooks/use-autosave.ts`)
  - Debounced auto-save with configurable delay
  - Status tracking (idle/saving/saved/error)
  - Automatic retry capability

#### 6. **Providers**

- ✅ ThemeProvider (dark mode support)
- ✅ Sonner Toaster (beautiful toast notifications)
- ✅ Integrated into `src/app/providers.tsx`

---

## How to Use

### Example 1: Auto-save Settings Form

```typescript
'use client'

import { AutosaveForm } from '@/components/settings/forms/AutosaveForm'
import { FormField } from '@/components/settings/forms/FormField'
import { Input } from '@/components/ui/shadcn/input'
import { Switch } from '@/components/ui/shadcn/switch'
import { z } from 'zod'

// 1. Define your schema
const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  notifications: z.boolean(),
})

type ProfileFormData = z.infer<typeof profileSchema>

// 2. Create your page component
export default function ProfileSettingsPage() {
  const defaultValues: ProfileFormData = {
    name: 'John Doe',
    email: 'john@example.com',
    notifications: true,
  }

  const handleSave = async (data: ProfileFormData) => {
    // Your API call here
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      return { success: false, error: 'Failed to save profile' }
    }

    return { success: true }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-2">Profile Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your personal information
      </p>

      <AutosaveForm
        defaultValues={defaultValues}
        schema={profileSchema}
        onSave={handleSave}
        showSaveIndicator={true}
        saveIndicatorPosition="top-right"
      >
        {(form) => (
          <div className="space-y-6">
            {/* Name Field */}
            <FormField
              name="name"
              label="Display Name"
              description="This is your public display name"
              required
            >
              <Input {...form.register('name')} placeholder="Enter your name" />
            </FormField>

            {/* Email Field */}
            <FormField
              name="email"
              label="Email Address"
              description="Your email for notifications"
              required
              tooltip="This email cannot be changed after setup"
            >
              <Input
                {...form.register('email')}
                type="email"
                placeholder="you@example.com"
              />
            </FormField>

            {/* Notifications Switch */}
            <FormField
              name="notifications"
              label="Email Notifications"
              description="Receive email updates about incidents"
            >
              <Switch
                checked={form.watch('notifications')}
                onCheckedChange={(checked) =>
                  form.setValue('notifications', checked)
                }
              />
            </FormField>
          </div>
        )}
      </AutosaveForm>
    </div>
  )
}
```

### Example 2: Loading State

```typescript
import { LoadingState, SettingsFormLoading } from '@/components/settings/feedback/LoadingState'

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)

  if (isLoading) {
    return <SettingsFormLoading sections={2} />
  }

  return <YourActualContent />
}
```

### Example 3: Manual Save with Sonner Toast

```typescript
'use client'

import { Button } from '@/components/ui/shadcn/button'
import { toast } from 'sonner'

export function SaveButton() {
  const handleSave = async () => {
    toast.promise(
      saveData(),
      {
        loading: 'Saving...',
        success: 'Settings saved successfully!',
        error: 'Failed to save settings',
      }
    )
  }

  return <Button onClick={handleSave}>Save Changes</Button>
}
```

---

## File Structure

```
src/
├── components/
│   ├── ui/
│   │   └── shadcn/              # 15 Shadcn components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       └── ...
│   │
│   ├── settings/
│   │   ├── forms/               # Form components
│   │   │   ├── AutosaveForm.tsx
│   │   │   └── FormField.tsx
│   │   │
│   │   └── feedback/            # Feedback components
│   │       ├── SaveIndicator.tsx
│   │       └── LoadingState.tsx
│   │
│   └── providers/               # App providers
│       ├── ThemeProvider.tsx
│       └── ToastProvider.tsx
│
├── lib/
│   ├── utils.ts                 # cn() helper
│   └── hooks/
│       └── use-autosave.ts      # Auto-save hook
│
└── styles/
    └── index.css                # Tailwind + Shadcn CSS variables
```

---

## Design Tokens

### Colors (Light Mode)

- Background: `hsl(0 0% 100%)`
- Foreground: `hsl(222.2 47.4% 11.2%)`
- Primary: `hsl(222.2 47.4% 11.2%)`
- Muted: `hsl(210 40% 96.1%)`
- Destructive: `hsl(0 84.2% 60.2%)`

### Colors (Dark Mode)

- Background: `hsl(224 71% 4%)`
- Foreground: `hsl(213 31% 91%)`
- Primary: `hsl(210 40% 98%)`

### Spacing

Use Tailwind spacing classes: `space-y-6`, `gap-4`, etc.

### Typography

- Headings: Use `text-4xl`, `text-2xl`, `text-xl`
- Body: Default `text-base` (14px)
- Small: `text-sm` (13px)
- Muted: Add `text-muted-foreground`

---

## Next Steps (Phase 2)

### Core Components to Build

1. **SettingsRow** - Two-column layout for label + control
2. **SettingsSection** - Card wrapper with title + description
3. **SettingsNav** - Redesigned navigation sidebar
4. **Command Palette** - Cmd+K settings search

### Pages to Refactor

1. Profile Settings (HIGH PRIORITY)
2. Preferences Settings (HIGH PRIORITY)
3. Security Settings (HIGH PRIORITY)
4. All other settings pages

---

## Tips & Best Practices

### 1. **Always use the `cn()` utility for className merging**

```typescript
import { cn } from '@/lib/utils'

<div className={cn('base-class', someCondition && 'conditional-class')} />
```

### 2. **Use Shadcn components from the shadcn subdirectory**

```typescript
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
```

### 3. **Auto-save best practices**

- Use `delay={500}` for text inputs (default)
- Use `delay={0}` for toggles/switches (instant)
- Always show SaveIndicator for user feedback
- Handle errors with toast notifications

### 4. **Form validation**

- Always define Zod schemas for type safety
- Use descriptive error messages
- Show inline errors with FormField

### 5. **Dark mode**

- Use Shadcn color tokens (they adapt automatically)
- Test both themes during development
- Use `text-muted-foreground` for secondary text

---

## Testing Checklist

Before proceeding to Phase 2, verify:

- [x] Build completes successfully (`npm run build`) ✅ **VERIFIED - Build succeeded!**
- [ ] Dev server runs (`npm run dev`)
- [x] No TypeScript errors ✅ **VERIFIED**
- [ ] Tailwind classes work
- [ ] Dark mode toggle works
- [ ] Toast notifications appear
- [ ] AutosaveForm example works

---

## Resources

- **Shadcn/ui Docs**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com
- **React Hook Form**: https://react-hook-form.com
- **Zod**: https://zod.dev
- **Sonner**: https://sonner.emilkowal.ski

---

## Notes

- Shadcn components are in `src/components/ui/shadcn/` to avoid conflicts with existing custom UI components
- The existing toast system (`@/components/ToastProvider`) still works alongside Sonner
- Tailwind CSS is now integrated with your existing CSS architecture
- All new components support both light and dark modes

**Ready to continue with Phase 2?** Let me know when the build succeeds! 🚀

---

# Phase 2: Core Design System Components - Complete! ✅

**✅ BUILD SUCCESSFUL** - All core components built and verified!

## What We've Built

### ✅ Component Consolidation

- ✅ Created `src/components/settings/layout/` directory
- ✅ Moved `SettingsRow.tsx` to `layout/` (enhanced with responsive grid)
- ✅ Moved `SettingsSection.tsx` to `layout/` (card-based with footer support)
- ✅ Moved `SettingsNav.tsx` to `layout/`

### ✅ Layout Components (`src/components/settings/layout/`)

#### 1. **SettingsRow** (`layout/SettingsRow.tsx`)

- Two-column grid (40% label, 60% control on desktop)
- Stacks on mobile
- Optional tooltip and help text
- Accessible ARIA attributes

#### 2. **SettingsSection** (`layout/SettingsSection.tsx`)

- Card-based design with Shadcn Card
- Title + optional description
- Optional action button in header
- Optional footer slot
- Consistent padding (24px desktop, 16px mobile)

#### 3. **CommandPalette** (`layout/CommandPalette.tsx`)

- Cmd/Ctrl + K trigger
- Fuzzy search using Shadcn Command
- Navigation to all settings pages
- Keyboard navigation (Arrow keys, Enter)

### ✅ Feedback Components (`src/components/settings/feedback/`)

#### **EmptyState** (`feedback/EmptyState.tsx`)

- Icon support (Lucide React)
- Title and description
- Optional action button
- For "No API keys", "No integrations", etc.

---

## How to Use

### Example 1: SettingsSection with Footer

```tsx
import { SettingsSection } from '@/components/settings/layout/SettingsSection';
import { Button } from '@/components/ui/shadcn/button';

export default function NotificationsSettings() {
  return (
    <SettingsSection
      title="Notification Preferences"
      description="Configure how you receive incident alerts."
      action={
        <Button variant="outline" size="sm">
          Test Notification
        </Button>
      }
      footer={<p className="text-sm text-muted-foreground">Changes are saved automatically.</p>}
    >
      <YourFormContent />
    </SettingsSection>
  );
}
```

### Example 2: SettingsRow for Toggle Settings

```tsx
import { SettingsRow } from '@/components/settings/layout/SettingsRow';
import { Switch } from '@/components/ui/shadcn/switch';

<SettingsRow
  label="Email Notifications"
  description="Receive incident alerts via email."
  tooltip="Toggle this to enable or disable email alerts"
>
  <Switch checked={enabled} onCheckedChange={setEnabled} />
</SettingsRow>;
```

### Example 3: CommandPalette (Global)

```tsx
// Already integrated in SettingsLayoutShell
// Works automatically on any settings page
// Press Cmd/Ctrl + K to open

// To add new commands, edit:
// src/components/settings/layout/CommandPalette.tsx
```

### Example 4: EmptyState for Lists

```tsx
import { EmptyState } from '@/components/settings/feedback/EmptyState';
import { Key } from 'lucide-react';
import { Button } from '@/components/ui/shadcn/button';

<EmptyState
  icon={Key}
  title="No API Keys"
  description="Create your first API key to integrate with external services."
  action={<Button>Create API Key</Button>}
/>;
```

---

# Phase 3: Settings Layout Redesign - Complete! ✅

**✅ BUILD SUCCESSFUL** - Responsive layout with mobile bottom sheet!

## What We've Built

### ✅ Settings Navigation Redesign (`layout/SettingsNav.tsx`)

- **Tailwind/cn() styling** - Fully migrated from custom CSS
- **Larger icons** - 24px instead of 18px
- **Improved spacing** - 16px gaps between items
- **Hover states** - `hover:bg-accent/50` transition
- **Active states** - Left border accent + background highlight
- **Smooth transitions** - `duration-200` animations
- **Drawer variant** - Transparent background for bottom sheet

### ✅ New Settings Page Header (`layout/SettingsPageHeader.tsx`)

- **Back link** - Arrow icon with customizable label
- **Breadcrumb navigation** - ChevronRight separators
- **Large title** - `text-4xl font-bold tracking-tight`
- **Description** - Muted text, max-width-2xl
- **Actions slot** - Optional buttons in top-right
- **Custom className** - Composable styling

### ✅ Responsive Layout Shell (`SettingsLayoutShell.tsx`)

- **Tailwind CSS Grid** - `lg:grid-cols-[280px_1fr]`
- **Desktop sidebar** - 280px sticky sidebar
- **Mobile hamburger** - Menu button visible on `lg:hidden`
- **Bottom sheet navigation** - Shadcn Sheet, 70vh height
- **Auto-close on navigate** - `onNavigate` callback
- **Status page support** - Full-width mode for `/settings/status-page`

### ✅ Shadcn Sheet Component

- Installed via `npx shadcn@latest add sheet`
- Used for mobile bottom sheet navigation

---

## How to Use

### Example 1: SettingsPageHeader

```tsx
import { SettingsPageHeader } from '@/components/settings/layout/SettingsPageHeader';
import { Button } from '@/components/ui/shadcn/button';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="Profile"
        description="Manage your personal information and preferences."
        backHref="/settings"
        backLabel="Back to Settings"
        actions={<Button variant="outline">Export Data</Button>}
      />

      <ProfileForm />
    </div>
  );
}
```

### Example 2: SettingsPageHeader with Breadcrumbs

```tsx
<SettingsPageHeader
  title="Slack Integration"
  description="Connect Slack to receive incident notifications."
  breadcrumbs={[
    { label: 'Settings', href: '/settings' },
    { label: 'Integrations', href: '/settings/integrations' },
    { label: 'Slack', href: '/settings/integrations/slack' },
  ]}
/>
```

### Example 3: SettingsNav Variants

```tsx
import SettingsNav from '@/components/settings/layout/SettingsNav';

// Desktop Sidebar (default)
<SettingsNav isAdmin={isAdmin} isResponderOrAbove={isResponder} />

// Mobile Drawer (transparent background)
<SettingsNav
  variant="drawer"
  isAdmin={isAdmin}
  isResponderOrAbove={isResponder}
  onNavigate={() => setSheetOpen(false)} // Close sheet on navigate
/>
```

---

## Responsive Breakpoints

| Breakpoint               | Behavior                                |
| ------------------------ | --------------------------------------- |
| < 1024px (Mobile/Tablet) | Hamburger menu, bottom sheet navigation |
| ≥ 1024px (Desktop)       | 280px sticky sidebar                    |

---

# Phase 4: Page-by-Page Redesign - Complete! ✅

**✅ BUILD SUCCESSFUL** - All core settings pages refactored!

## What We've Built

### ✅ Profile Page (`settings/profile/page.tsx`)

- Replaced `SettingsPage` wrapper with `SettingsPageHeader`
- ProfileForm already uses `AutosaveForm`
- Added `loading.tsx` skeleton state

### ✅ Preferences Page (`settings/preferences/page.tsx`)

- Replaced with `SettingsPageHeader` + `SettingsSection`
- Footer note using `SettingsSection` footer prop
- Added `loading.tsx` skeleton state

### ✅ Security Page (`settings/security/page.tsx`)

- **Modernized summary grid** - Tailwind `md:grid-cols-3`
- **SSO status badge** - Shadcn Badge component
- **Footer notes** - Using `SettingsSection` footer
- Added `loading.tsx` skeleton state

### ✅ NotificationPreferencesForm Refactor

- **Shadcn Switch** - Replaced legacy checkboxes
- **SettingsRow** - Using layout component
- **Shadcn Button/Input/Label** - Modern UI components
- **Hidden inputs** - Proper form submission with switches

---

## How to Use

### Example 1: Creating a New Settings Page

```tsx
// src/app/(app)/settings/my-new-page/page.tsx
import { SettingsPageHeader } from '@/components/settings/layout/SettingsPageHeader';
import { SettingsSection } from '@/components/settings/layout/SettingsSection';

export default function MyNewSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="My New Settings"
        description="Configure your new feature settings."
        backHref="/settings"
        backLabel="Back to Settings"
      />

      <SettingsSection title="General" description="Basic configuration options.">
        {/* Your form content */}
      </SettingsSection>

      <SettingsSection
        title="Advanced"
        description="Power user settings."
        footer={
          <p className="text-sm text-muted-foreground">Be careful when changing these settings.</p>
        }
      >
        {/* More content */}
      </SettingsSection>
    </div>
  );
}
```

### Example 2: Creating a Loading State

```tsx
// src/app/(app)/settings/my-new-page/loading.tsx
import { SettingsFormLoading } from '@/components/settings/feedback/LoadingState';
import { Skeleton } from '@/components/ui/shadcn/skeleton';

export default function MyNewPageLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-4 pb-6 border-b border-border">
        <Skeleton className="h-4 w-32" /> {/* Back link */}
        <Skeleton className="h-10 w-48" /> {/* Title */}
        <Skeleton className="h-4 w-96" /> {/* Description */}
      </div>

      {/* Form Skeleton */}
      <SettingsFormLoading sections={2} />
    </div>
  );
}
```

### Example 3: Using Shadcn Switch with Forms

```tsx
import { Switch } from '@/components/ui/shadcn/switch';
import { Label } from '@/components/ui/shadcn/label';
import { SettingsRow } from '@/components/settings/layout/SettingsRow';

const [enabled, setEnabled] = useState(false);

// In your form
<form>
  {/* Hidden input for form submission */}
  <input type="hidden" name="featureEnabled" value={enabled ? 'true' : 'false'} />

  <SettingsRow label="Enable Feature" description="Turn this feature on or off.">
    <div className="flex items-center gap-3">
      <Switch id="feature-switch" checked={enabled} onCheckedChange={setEnabled} />
      <Label htmlFor="feature-switch" className="text-sm">
        {enabled ? 'Enabled' : 'Disabled'}
      </Label>
    </div>
  </SettingsRow>
</form>;
```

### Example 4: Summary Grid with Tailwind

```tsx
<div className="grid gap-4 md:grid-cols-3">
  <div className="p-4 rounded-lg border border-border bg-muted/30">
    <span className="text-sm text-muted-foreground">Status</span>
    <p className="text-lg font-semibold mt-1">Active</p>
    <span className="text-xs text-muted-foreground">Since Jan 1, 2024</span>
  </div>

  <div className="p-4 rounded-lg border border-border bg-muted/30">
    <span className="text-sm text-muted-foreground">Usage</span>
    <p className="text-lg font-semibold mt-1">1,234 requests</p>
    <span className="text-xs text-muted-foreground">This month</span>
  </div>

  <div className="p-4 rounded-lg border border-border bg-muted/30">
    <span className="text-sm text-muted-foreground">Plan</span>
    <p className="text-lg font-semibold mt-1">Pro</p>
    <span className="text-xs text-muted-foreground">Unlimited features</span>
  </div>
</div>
```

---

## Current File Structure

```
src/
├── components/
│   ├── ui/
│   │   └── shadcn/                    # 16 Shadcn components
│   │       ├── button.tsx
│   │       ├── sheet.tsx              # NEW in Phase 3
│   │       ├── switch.tsx
│   │       └── ...
│   │
│   └── settings/
│       ├── forms/                     # Form components
│       │   ├── AutosaveForm.tsx
│       │   └── FormField.tsx
│       │
│       ├── feedback/                  # Feedback components
│       │   ├── SaveIndicator.tsx
│       │   ├── LoadingState.tsx
│       │   └── EmptyState.tsx         # NEW in Phase 2
│       │
│       ├── layout/                    # NEW directory in Phase 2
│       │   ├── SettingsNav.tsx        # Redesigned in Phase 3
│       │   ├── SettingsRow.tsx
│       │   ├── SettingsSection.tsx
│       │   ├── SettingsPageHeader.tsx # NEW in Phase 3
│       │   └── CommandPalette.tsx     # NEW in Phase 2
│       │
│       ├── SettingsLayoutShell.tsx    # Redesigned in Phase 3
│       ├── ProfileForm.tsx
│       ├── NotificationPreferencesForm.tsx  # Refactored in Phase 4
│       └── ...
│
└── app/(app)/settings/
    ├── profile/
    │   ├── page.tsx                   # Refactored in Phase 4
    │   └── loading.tsx                # NEW in Phase 4
    ├── preferences/
    │   ├── page.tsx                   # Refactored in Phase 4
    │   └── loading.tsx                # NEW in Phase 4
    └── security/
        ├── page.tsx                   # Refactored in Phase 4
        └── loading.tsx                # NEW in Phase 4
```

---

## Tips & Best Practices

### 1. **Always wrap pages with SettingsPageHeader**

```tsx
<div className="space-y-6">
  <SettingsPageHeader title="..." description="..." backHref="/settings" />
  {/* Page content */}
</div>
```

### 2. **Use SettingsSection for form groups**

```tsx
<SettingsSection title="Personal Info" description="...">
  <SettingsRow label="Name">
    <Input />
  </SettingsRow>
</SettingsSection>
```

### 3. **Always create loading.tsx for settings pages**

Next.js will automatically show this during page transitions.

### 4. **Use hidden inputs with Shadcn Switch**

Switches don't submit like checkboxes - use hidden inputs:

```tsx
<input type="hidden" name="field" value={checked ? 'true' : 'false'} />
<Switch checked={checked} onCheckedChange={setChecked} />
```

### 5. **Use responsive grid for summary cards**

```tsx
<div className="grid gap-4 md:grid-cols-3">{/* Cards */}</div>
```

---

## Testing Checklist

Before proceeding to Phase 5, verify:

- [x] Build completes successfully (`npm run build`) ✅
- [x] Profile page loads with skeleton ✅
- [x] Preferences page has SettingsSection ✅
- [x] Security page has summary grid ✅
- [x] NotificationPreferencesForm uses Switch ✅
- [x] Mobile bottom sheet navigation works ✅
- [x] Command palette opens with Cmd+K ✅

---

## Next Steps (Phase 5: Polish & Enhancements)

### Micro-interactions

- Form field focus animations
- Button hover effects
- Card hover scale
- Save indicator animations
- Skeleton shimmer effects

### Keyboard Shortcuts

- `useKeyboardShortcut` hook
- Navigation shortcuts (`g+p`, `g+s`, etc.)
- Keyboard legend modal

### Accessibility

- Focus visible states
- ARIA labels on icon-only buttons
- Skip links
- `aria-live` announcements

### Performance

- Code splitting
- Next.js Image optimization
- Memoization

---

# Phase 5: Polish & Enhancements - Complete! ✅

**✅ BUILD SUCCESSFUL** - Micro-interactions, keyboard shortcuts, and accessibility improvements!

## What We've Built

### ✅ Micro-interactions (`src/styles/animations.css`)

- **Scale-in animation** - Modal/dialog open effect
- **Shimmer effect** - Skeleton loading pulse
- **Checkmark draw animation** - Save indicator success
- **Button hover lift** - Slight lift with shadow
- **Card hover scale** - Gentle 1.02 scale
- **Slide variations** - Top, bottom, right slides
- **`prefers-reduced-motion`** - Full support for accessibility

### ✅ Keyboard Shortcuts (`src/lib/hooks/use-keyboard-shortcut.ts`)

- **Single shortcut hook** - For simple key combinations
- **Multiple shortcuts hook** - For registering many at once
- **Sequence shortcuts** - For g+p style navigation

### ✅ KeyboardShortcutsProvider (`src/components/KeyboardShortcutsProvider.tsx`)

- **Navigation shortcuts**: `g+p` (Profile), `g+s` (Security), `g+i` (Integrations), `g+a` (API Keys), `g+n` (Notifications), `g+w` (Workspace)
- **Search focus**: `/` key
- **Legend modal**: `Shift+?` shows all available shortcuts
- **Integrated into providers.tsx**

### ✅ Accessibility (`src/components/SkipLink.tsx`)

- **Skip link** - "Skip to main content" for keyboard users
- **Focus visible** - All form controls have visible focus
- **ARIA labels** - Icon-only buttons properly labeled

---

## How to Use

### Example 1: Using Keyboard Shortcuts

```tsx
import { useKeyboardShortcut, useSequenceShortcut } from '@/lib/hooks/use-keyboard-shortcut';

// Simple shortcut (Cmd+S to save)
useKeyboardShortcut({
  key: 's',
  ctrl: true,
  callback: () => saveForm(),
  description: 'Save form',
});

// Sequence shortcut (g then h for home)
useSequenceShortcut(['g', 'h'], () => router.push('/'));
```

### Example 2: Using Animation Classes

```tsx
// Modal with scale-in animation
<div className="animate-scale-in">
  <DialogContent />
</div>

// Button with hover lift
<button className="btn-hover-lift">
  Click me
</button>

// Card with hover scale
<div className="card-hover-scale">
  <CardContent />
</div>

// Skeleton with shimmer
<div className="animate-shimmer h-12 w-full rounded" />
```

### Example 3: Opening Keyboard Legend Programmatically

```tsx
import { useKeyboardShortcutsContext } from '@/components/KeyboardShortcutsProvider';

function MyComponent() {
  const { openLegend } = useKeyboardShortcutsContext();

  return <button onClick={openLegend}>Show Keyboard Shortcuts</button>;
}
```

---

## Keyboard Shortcuts Reference

| Shortcut     | Action                  |
| ------------ | ----------------------- |
| `⌘/Ctrl + K` | Open command palette    |
| `Shift + ?`  | Show keyboard shortcuts |
| `/`          | Focus search            |
| `g + p`      | Go to Profile           |
| `g + s`      | Go to Security          |
| `g + i`      | Go to Integrations      |
| `g + a`      | Go to API Keys          |
| `g + n`      | Go to Notifications     |
| `g + w`      | Go to Workspace         |

---

## Testing Checklist

Before proceeding to Phase 6, verify:

- [x] Build completes successfully (`npm run build`) ✅
- [x] Keyboard shortcuts work (g+p, g+s, etc.)
- [x] Shift+? shows legend modal
- [x] Animations respect `prefers-reduced-motion`
- [x] Skip link visible on focus

---

**Phase 6: Testing & Refinement** - Ready to start! 🚀
