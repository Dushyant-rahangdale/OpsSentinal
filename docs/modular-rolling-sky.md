# World-Class Settings Page Redesign - OpsSentinal

## Executive Summary

**Goal**: Transform OpsSentinal settings pages into a world-class experience with modern design, smooth interactions, and professional polish comparable to Linear, Vercel, and Stripe.

**Current State**:
- 15+ settings pages with inconsistent design patterns
- Mix of Tailwind, inline styles, and custom CSS
- Basic form handling with manual save buttons
- Outdated UI components (emoji icons, basic toggles)
- No auto-save, limited feedback mechanisms
- Cramped spacing and small typography

**Target State**:
- Unified design system with Shadcn/ui components
- Auto-save forms with optimistic updates
- Beautiful animations and transitions
- Dark mode support
- Generous spacing and modern typography
- Toast notifications and skeleton loaders
- Command palette for settings navigation
- Accessibility-first approach

---

## Design Inspiration & Principles

### Visual Inspiration
**Linear + Vercel Hybrid**
- **Linear**: Premium animations, command palette, smooth transitions, keyboard shortcuts
- **Vercel**: Clean minimalism, inline editing, generous whitespace, subtle feedback

### Design Principles
1. **Clarity First**: Every element has clear purpose and hierarchy
2. **Smooth Interactions**: 60fps animations, instant feedback, no jarring transitions
3. **Progressive Disclosure**: Show what's needed, hide complexity
4. **Consistency**: Same patterns everywhere
5. **Accessibility**: Keyboard-first, screen reader friendly, WCAG 2.1 AA

### Visual Standards
- **Spacing Scale**: 4, 8, 12, 16, 24, 32, 48, 64, 96px
- **Typography Scale**:
  - h1: 2.5rem (40px) - Page titles
  - h2: 1.875rem (30px) - Section headers
  - h3: 1.5rem (24px) - Subsection titles
  - body: 0.875rem (14px) - Base text
  - small: 0.8125rem (13px) - Secondary text
- **Border Radius**: 6px (sm), 8px (md), 12px (lg), 16px (xl)
- **Elevation**: 5 levels of shadows (xs to 2xl)
- **Animation Curves**: ease-out for entrances, ease-in-out for interactions

---

## Tech Stack

### Design System
```
├── Shadcn/ui (v0.8+)          - Component library
├── Radix UI                    - Accessible primitives
├── CVA (Class Variance Auth)   - Type-safe variants
├── Tailwind CSS 3.4+           - Utility-first styling
└── Next-themes                 - Dark mode management
```

### Form Management
```
├── React Hook Form 7.5+        - Performance-optimized forms
├── Zod 3.22+                   - Schema validation
└── Next.js Server Actions      - Form submissions
```

### Feedback & Polish
```
├── Sonner                      - Beautiful toast notifications
├── Framer Motion 11+           - Smooth animations
├── React Hot Toast (backup)    - Alternative toast system
└── Vaul                        - Mobile bottom sheets
```

### Developer Tools
```
├── TypeScript 5.3+             - Type safety
├── ESLint + Prettier           - Code quality
└── Husky (optional)            - Git hooks
```

---

## Architecture Overview

```
src/
├── components/
│   ├── ui/                     # Shadcn/ui components (NEW)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── switch.tsx
│   │   ├── select.tsx
│   │   ├── toast.tsx
│   │   ├── dialog.tsx
│   │   ├── command.tsx
│   │   ├── skeleton.tsx
│   │   ├── card.tsx
│   │   ├── tabs.tsx
│   │   ├── separator.tsx
│   │   ├── label.tsx
│   │   ├── badge.tsx
│   │   ├── alert.tsx
│   │   └── ... (30+ components)
│   │
│   ├── settings/
│   │   ├── shared/             # Shared settings components (REFACTORED)
│   │   │   ├── SettingsShell.tsx
│   │   │   ├── SettingsLayout.tsx
│   │   │   ├── SettingsNav.tsx
│   │   │   ├── SettingsSidebar.tsx
│   │   │   ├── SettingsHeader.tsx
│   │   │   ├── SettingsSection.tsx
│   │   │   ├── SettingsCard.tsx
│   │   │   ├── SettingsRow.tsx (ENHANCED)
│   │   │   └── SettingsCommandPalette.tsx (NEW)
│   │   │
│   │   ├── forms/              # Form components (NEW)
│   │   │   ├── AutosaveForm.tsx
│   │   │   ├── FormField.tsx
│   │   │   ├── FormSection.tsx
│   │   │   ├── FormActions.tsx
│   │   │   └── FieldLabel.tsx
│   │   │
│   │   ├── feedback/           # Feedback components (NEW)
│   │   │   ├── SaveIndicator.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── SuccessAnimation.tsx
│   │   │
│   │   └── [page-specific]/   # Page-specific components (REFACTORED)
│   │       ├── ProfileForm.tsx
│   │       ├── PreferencesForm.tsx
│   │       ├── SecurityForm.tsx
│   │       └── ...
│   │
│   └── providers/              # Context providers (NEW)
│       ├── ThemeProvider.tsx
│       ├── ToastProvider.tsx
│       └── SettingsProvider.tsx
│
├── lib/
│   ├── utils.ts                # Utility functions (cn, formatters)
│   ├── validations/            # Zod schemas (NEW)
│   │   ├── profile.ts
│   │   ├── preferences.ts
│   │   ├── security.ts
│   │   └── ...
│   │
│   └── hooks/                  # Custom hooks (NEW)
│       ├── use-autosave.ts
│       ├── use-toast.ts
│       ├── use-media-query.ts
│       └── use-keyboard-shortcut.ts
│
├── styles/
│   └── settings/               # Settings-specific styles (REFACTORED)
│       ├── modern.css          # New modern styles
│       └── animations.css      # Animation definitions
│
└── app/(app)/settings/         # Settings pages (ALL REFACTORED)
    ├── page.tsx                # Overview dashboard
    ├── profile/page.tsx
    ├── preferences/page.tsx
    ├── security/page.tsx
    ├── workspace/page.tsx
    ├── custom-fields/page.tsx
    ├── system/page.tsx
    ├── notifications/page.tsx
    ├── integrations/page.tsx
    ├── api-keys/page.tsx
    └── ... (all other pages)
```

---

## Implementation Plan

### Phase 1: Foundation Setup (Days 1-2)

#### Step 1.1: Install Dependencies

```bash
# Shadcn/ui setup
npx shadcn-ui@latest init

# Additional dependencies
npm install react-hook-form @hookform/resolvers zod
npm install sonner framer-motion vaul
npm install next-themes
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-icons lucide-react
```

**Configuration Files to Update:**
- `tailwind.config.ts` - Add Shadcn theme tokens
- `components.json` - Shadcn configuration
- `tsconfig.json` - Path aliases

#### Step 1.2: Configure Tailwind with Design Tokens

**File**: `tailwind.config.ts`

Add comprehensive design tokens:
```typescript
{
  theme: {
    extend: {
      colors: {
        // Base colors with dark mode variants
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { ... },
        secondary: { ... },
        destructive: { ... },
        muted: { ... },
        accent: { ... },
        // Custom semantic colors
        success: { ... },
        warning: { ... },
        info: { ... }
      },
      spacing: {
        // Consistent scale
        '4.5': '1.125rem',  // 18px
        '18': '4.5rem',     // 72px
        '88': '22rem',      // 352px
      },
      fontSize: {
        // Modern scale
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],      // 11px
        'xs': ['0.8125rem', { lineHeight: '1.25rem' }],    // 13px
        'sm': ['0.875rem', { lineHeight: '1.5rem' }],      // 14px
        'base': ['1rem', { lineHeight: '1.75rem' }],       // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],     // 18px
        'xl': ['1.25rem', { lineHeight: '2rem' }],         // 20px
        '2xl': ['1.5rem', { lineHeight: '2.25rem' }],      // 24px
        '3xl': ['1.875rem', { lineHeight: '2.5rem' }],     // 30px
        '4xl': ['2.25rem', { lineHeight: '3rem' }],        // 36px
        '5xl': ['2.5rem', { lineHeight: '3.5rem' }],       // 40px
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
      keyframes: {
        // Smooth animations
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      }
    }
  }
}
```

#### Step 1.3: Install Core Shadcn Components

```bash
# Essential form components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add radio-group

# Layout components
npx shadcn-ui@latest add card
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add tabs

# Feedback components
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add badge

# Interactive components
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add command
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add tooltip

# Utility components
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add scroll-area
```

**Result**: All components installed in `src/components/ui/`

#### Step 1.4: Setup Theme Provider

**File**: `src/components/providers/ThemeProvider.tsx` (NEW)

```typescript
'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

**File**: `src/app/layout.tsx` (UPDATE)

Wrap with theme provider:
```typescript
import { ThemeProvider } from '@/components/providers/ThemeProvider'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

#### Step 1.5: Setup Toast Provider

**File**: `src/components/providers/ToastProvider.tsx` (NEW)

```typescript
'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      theme="light"
    />
  )
}
```

Add to root layout after ThemeProvider.

---

### Phase 2: Core Design System Components (Days 3-4)

#### Step 2.1: Create AutosaveForm Component

**File**: `src/components/settings/forms/AutosaveForm.tsx` (NEW)

**Features**:
- Debounced auto-save (500ms after last change)
- Optimistic UI updates
- "Saving..." → "Saved ✓" indicator
- Error handling with toast notifications
- Uses React Hook Form + Server Actions

**Props**:
```typescript
interface AutosaveFormProps<T extends FieldValues> {
  defaultValues: T
  onSave: (data: T) => Promise<{ success: boolean; error?: string }>
  schema: ZodSchema<T>
  children: React.ReactNode
  className?: string
}
```

**Implementation Pattern**:
```typescript
- useForm with Zod resolver
- useWatch to track changes
- useDebounce (500ms) for auto-save trigger
- Show save status in UI (idle/saving/saved/error)
- Toast on error, subtle checkmark on success
```

#### Step 2.2: Create FormField Wrapper

**File**: `src/components/settings/forms/FormField.tsx` (NEW)

**Features**:
- Consistent layout (label + input + error)
- Integrates with React Hook Form
- Accessible (proper ARIA attributes)
- Supports help text and tooltips

**Visual Structure**:
```tsx
<div className="space-y-2">
  <Label>
    {label}
    {required && <span className="text-destructive">*</span>}
    {tooltip && <TooltipIcon />}
  </Label>
  {description && <p className="text-sm text-muted-foreground">{description}</p>}
  {children /* Input component */}
  {error && <p className="text-sm text-destructive">{error.message}</p>}
</div>
```

#### Step 2.3: Create SettingsRow Component (Enhanced)

**File**: `src/components/settings/shared/SettingsRow.tsx` (REFACTOR)

**New Design**:
```
┌────────────────────────────────────────────────────────┐
│  Label                                      [Control]  │
│  Secondary description text                            │
└────────────────────────────────────────────────────────┘
```

**Features**:
- Two-column grid (40% label, 60% control on desktop)
- Stacks on mobile
- Optional inline help text
- Integration with FormField
- Hover state for interactive rows

#### Step 2.4: Create SettingsSection Card

**File**: `src/components/settings/shared/SettingsSection.tsx` (REFACTOR)

**New Design**:
```
┌────────────────────────────────────────────────────────┐
│  Section Title                              [Action]   │
│  Optional description explaining this section          │
│  ─────────────────────────────────────────────────     │
│  Content area with SettingsRow components              │
│                                                         │
└────────────────────────────────────────────────────────┘
```

**Features**:
- Card-based design with subtle shadow
- Header with title + optional action button
- Separator between header and content
- Consistent padding (24px on desktop, 16px mobile)
- Optional footer for additional actions

#### Step 2.5: Create Save Indicator

**File**: `src/components/settings/feedback/SaveIndicator.tsx` (NEW)

**States**:
1. **Idle**: No indicator shown
2. **Saving**: "Saving..." with spinner
3. **Saved**: "Saved ✓" with checkmark (fades after 2s)
4. **Error**: "Failed to save" with error icon

**Visual Design**:
- Small, unobtrusive indicator
- Appears in top-right of form or inline
- Smooth fade in/out animations
- Color-coded (neutral/success/error)

#### Step 2.6: Create Skeleton Loaders

**File**: `src/components/settings/feedback/LoadingState.tsx` (NEW)

**Purpose**: Replace "Loading..." text with skeleton UI

**Patterns**:
1. **Form Skeleton**: Mimics SettingsRow layout
2. **Card Skeleton**: Mimics SettingsSection layout
3. **List Skeleton**: For API keys, team members, etc.

**Example**:
```tsx
<div className="space-y-6">
  <Skeleton className="h-12 w-full" /> {/* Header */}
  <Skeleton className="h-24 w-full" /> {/* Card 1 */}
  <Skeleton className="h-24 w-full" /> {/* Card 2 */}
</div>
```

#### Step 2.7: Create Empty States

**File**: `src/components/settings/feedback/EmptyState.tsx` (NEW)

**Use Cases**:
- No API keys created yet
- No team members
- No integrations connected

**Design**:
- Icon (from Lucide)
- Heading
- Description text
- Call-to-action button
- Optional illustration

---

### Phase 3: Settings Layout Redesign (Days 5-6)

#### Step 3.1: Redesign Settings Navigation

**File**: `src/components/settings/shared/SettingsNav.tsx` (MAJOR REFACTOR)

**New Features**:
1. **Visual Improvements**:
   - Larger icons (20px → 24px)
   - Better spacing (12px → 16px gaps)
   - Hover states with background color
   - Active state with accent border + background
   - Smooth transitions

2. **Grouping**:
   - Visual separators between groups
   - Group headers with subtle text

3. **Keyboard Navigation**:
   - Arrow keys to navigate
   - Enter to select
   - / to focus search

**New Visual Design**:
```
┌─ Settings ─────────────────────┐
│                                 │
│  ACCOUNT                        │
│  👤  Profile             →      │
│  ⚙️   Preferences        →      │
│  🔒  Security            →      │
│                                 │
│  WORKSPACE                      │
│  🏢  Organization        →      │
│  📝  Custom Fields       →      │
│  ⚡  System Settings     →      │
│                                 │
│  INTEGRATIONS                   │
│  🔌  Integrations Hub    →      │
│  💬  Slack               →      │
│                                 │
└─────────────────────────────────┘
```

#### Step 3.2: Implement Command Palette

**File**: `src/components/settings/shared/SettingsCommandPalette.tsx` (NEW)

**Trigger**: Cmd/Ctrl + K

**Features**:
- Fuzzy search all settings
- Keyboard navigation
- Recent pages
- Grouped results
- Quick actions (e.g., "Create API Key")

**Implementation**: Use Shadcn Command component

**Visual**:
```
┌─ Quick Settings ───────────────────────────┐
│  🔍 Search settings...                     │
├────────────────────────────────────────────┤
│  ACCOUNT                                   │
│  👤  Profile settings                      │
│  🔒  Security settings                     │
│                                            │
│  WORKSPACE                                 │
│  ⚡  System configuration                  │
│  📝  Custom fields                         │
│                                            │
│  Press ↑↓ to navigate, ↵ to select, esc   │
└────────────────────────────────────────────┘
```

#### Step 3.3: Redesign Settings Header

**File**: `src/components/settings/shared/SettingsHeader.tsx` (REFACTOR)

**New Layout**:
```
┌─────────────────────────────────────────────────────┐
│  ← Back to settings                                  │
│                                                      │
│  Profile Settings                                    │
│  Manage your personal information and preferences   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Optional back link
- Large page title (40px)
- Descriptive subtitle (14px, muted)
- Optional action buttons in top-right
- Breadcrumb navigation

#### Step 3.4: Create Settings Container Layout

**File**: `src/components/settings/shared/SettingsLayout.tsx` (REFACTOR)

**New Structure**:
```
┌─ Sidebar ─┬─ Main Content ────────────────────────────────┐
│           │  Header                                        │
│ Nav Items │  ───────────────────────────────────────────  │
│           │                                                │
│           │  Section Card 1                                │
│           │  Section Card 2                                │
│           │  Section Card 3                                │
│           │                                                │
│           │                                                │
└───────────┴────────────────────────────────────────────────┘
```

**Responsive**:
- Desktop: Sidebar visible (280px wide, sticky)
- Tablet: Collapsible sidebar with hamburger
- Mobile: Bottom sheet navigation

**Implementation**:
- Use Shadcn Sheet component for mobile
- CSS Grid for layout
- Smooth transitions

---

### Phase 4: Page-by-Page Redesign (Days 7-12)

#### General Approach for All Pages

**Pattern**:
1. Replace manual forms with AutosaveForm
2. Use FormField for all inputs
3. Replace custom components with Shadcn
4. Add skeleton loading states
5. Implement toast notifications
6. Add proper error handling
7. Improve spacing and typography

#### Step 4.1: Profile Page Redesign

**File**: `src/app/(app)/settings/profile/page.tsx` (REFACTOR)
**Component**: `src/components/settings/ProfileForm.tsx` (REFACTOR)

**Changes**:
1. **Avatar Upload**:
   - Large circular avatar (120px)
   - Hover overlay with "Change photo"
   - Drag & drop support
   - Image cropper modal

2. **Form Fields**:
   - Auto-save on blur
   - Replace emoji lock icons with proper Lock icons
   - Disabled state styling for read-only fields
   - Tooltip explaining "Synced from IdP"

3. **Layout**:
   ```tsx
   <AutosaveForm onSave={updateProfile} schema={profileSchema}>
     <SettingsSection title="Personal Information">
       <FormField label="Display Name" name="name">
         <Input />
       </FormField>
       <FormField label="Email" name="email">
         <Input disabled />
         <HelpText>Managed by your organization</HelpText>
       </FormField>
       {/* ... */}
     </SettingsSection>

     <SettingsSection title="Organization">
       <FormField label="Role" name="role">
         <Input disabled />
       </FormField>
       {/* ... */}
     </SettingsSection>
   </AutosaveForm>
   ```

**Visual Improvements**:
- Increase spacing between fields (16px → 24px)
- Larger input heights (36px → 40px)
- Better typography hierarchy
- Subtle hover states on editable fields

#### Step 4.2: Preferences Page Redesign

**File**: `src/app/(app)/settings/preferences/page.tsx` (REFACTOR)
**Component**: `src/components/settings/PreferencesForm.tsx` (REFACTOR)

**Changes**:
1. **Timezone Select**:
   - Replace basic select with Shadcn Combobox
   - Search functionality
   - Grouped by region
   - Shows current time in preview

2. **Toggle Switches**:
   - Replace checkboxes with modern Switch
   - Label on left, switch on right
   - Description text below
   - Auto-save on toggle

3. **Layout**:
   ```tsx
   <AutosaveForm onSave={updatePreferences} schema={preferencesSchema}>
     <SettingsSection title="Regional Settings">
       <SettingsRow
         label="Timezone"
         description="Used for email digests and timestamps"
       >
         <TimezoneCombobox />
       </SettingsRow>
     </SettingsSection>

     <SettingsSection title="Email Notifications">
       <SettingsRow
         label="Daily summary"
         description="Receive a daily digest of incidents"
       >
         <Switch />
       </SettingsRow>

       <SettingsRow
         label="Incident digest"
         description="How often to receive incident updates"
       >
         <Select>
           <option>High priority only</option>
           <option>All incidents</option>
           <option>None</option>
         </Select>
       </SettingsRow>
     </SettingsSection>
   </AutosaveForm>
   ```

#### Step 4.3: Security Page Redesign

**File**: `src/app/(app)/settings/security/page.tsx` (REFACTOR)
**Component**: `src/components/settings/SecurityForm.tsx` (REFACTOR)

**Changes**:
1. **Password Change**:
   - Show/hide password toggle
   - Real-time strength indicator (with visual bar)
   - Requirements checklist
   - Confirm password field
   - Manual save button (security action)

2. **SSO Status**:
   - Card showing SSO provider
   - Badge indicating status (Active/Inactive)
   - Last login timestamp

3. **Active Sessions**:
   - Table of active sessions
   - Device, location, last active
   - Revoke action with confirmation dialog

4. **Layout**:
   ```tsx
   <div className="space-y-6">
     <SettingsSection title="Password">
       <Form onSubmit={changePassword}>
         <FormField label="Current password">
           <PasswordInput />
         </FormField>
         <FormField label="New password">
           <PasswordInput />
           <PasswordStrength value={password} />
         </FormField>
         <FormField label="Confirm password">
           <PasswordInput />
         </FormField>
         <Button type="submit">Update password</Button>
       </Form>
     </SettingsSection>

     <SettingsSection title="Single Sign-On">
       <div className="flex items-center justify-between">
         <div>
           <p className="font-medium">Google Workspace</p>
           <p className="text-sm text-muted-foreground">
             Last login: 2 hours ago
           </p>
         </div>
         <Badge>Active</Badge>
       </div>
     </SettingsSection>

     <SettingsSection title="Active Sessions">
       <SessionsTable sessions={sessions} />
     </SettingsSection>
   </div>
   ```

#### Step 4.4: Workspace Page Redesign

**File**: `src/app/(app)/settings/workspace/page.tsx` (REFACTOR)

**Changes**:
1. **Organization Profile**:
   - Logo upload (similar to avatar)
   - Organization name (editable by admin)
   - Domain/subdomain

2. **Team Members**:
   - Data table with columns: Name, Email, Role, Last Active
   - Invite button (opens dialog)
   - Row actions (Edit role, Remove)
   - Search and filter

3. **Layout**: Similar to Profile with auto-save sections

#### Step 4.5: Custom Fields Page Redesign

**File**: `src/app/(app)/settings/custom-fields/page.tsx` (REFACTOR)

**Changes**:
1. **Fields List**:
   - Card-based list of custom fields
   - Drag-to-reorder (with Dnd Kit)
   - Edit inline or in modal
   - Delete with confirmation

2. **Create Field**:
   - Dialog form
   - Field type selector (Text, Number, Select, Multi-select, Date)
   - Validation rules
   - Default value

3. **Empty State**:
   - Show when no fields exist
   - Illustration + CTA

#### Step 4.6: System Settings Page Redesign

**File**: `src/app/(app)/settings/system/page.tsx` (REFACTOR)

**Changes**:
1. **App URL**:
   - Input with validation
   - Preview showing how it looks in emails

2. **SSO/OIDC Configuration**:
   - Expandable section
   - Multiple input fields
   - Test connection button
   - Status indicator

3. **Encryption**:
   - Danger zone for key rotation
   - Confirmation dialogs

4. **Layout**: Group related settings in collapsible sections

#### Step 4.7: Notifications Page Redesign

**File**: `src/app/(app)/settings/notifications/page.tsx` (REFACTOR)

**Changes**:
1. **Provider Tabs**:
   - Replace custom tabs with Shadcn Tabs
   - SMS / Push / WhatsApp
   - Badge showing configuration status

2. **Provider Forms**:
   - Auto-save configuration
   - Test send button
   - Clear visual feedback

3. **Notification History**:
   - Table with filters
   - Delivery status badges
   - Expand to see details

#### Step 4.8: Integrations Page Redesign

**File**: `src/app/(app)/settings/integrations/page.tsx` (REFACTOR)

**Changes**:
1. **Integration Cards**:
   - Grid layout (2-3 columns)
   - Each card shows logo, name, description
   - Status badge (Connected/Not connected)
   - Configure/Connect button

2. **Slack Integration**:
   - Dedicated page with setup wizard
   - Step-by-step progress indicator
   - Channel selector with preview

#### Step 4.9: API Keys Page Redesign

**File**: `src/app/(app)/settings/api-keys/page.tsx` (REFACTOR)

**Changes**:
1. **API Keys Table**:
   - Columns: Name, Scopes, Created, Last Used, Actions
   - Copy key button (only shows key once after creation)
   - Revoke with confirmation

2. **Create Key**:
   - Dialog form
   - Name field
   - Scope selector (checkboxes)
   - Expiry date picker
   - Generate button

3. **Empty State**: Guide to creating first key

#### Step 4.10: Billing Page Redesign

**File**: `src/app/(app)/settings/billing/page.tsx` (REFACTOR)

**Changes**:
1. **Current Plan**:
   - Large card showing plan name
   - Features list
   - Usage stats with progress bars
   - Upgrade CTA

2. **Invoices**:
   - Table with download links
   - Filter by date

3. **Payment Method**:
   - Card ending in XXXX
   - Update button

---

### Phase 5: Polish & Enhancements (Days 13-14)

#### Step 5.1: Add Micro-interactions

**Animations to Add**:
1. **Form Field Focus**: Subtle scale on input focus
2. **Button Hover**: Slight lift with shadow
3. **Card Hover**: Gentle scale up (1.02)
4. **Switch Toggle**: Smooth slide animation
5. **Save Indicator**: Fade in/out, checkmark animation
6. **Toast Notifications**: Slide in from top-right
7. **Modal Open**: Scale in with backdrop fade
8. **Skeleton Pulse**: Shimmer effect

**Implementation**:
- Use Framer Motion for complex animations
- CSS transitions for simple hover/focus
- Respect `prefers-reduced-motion`

#### Step 5.2: Keyboard Shortcuts

**Global Shortcuts**:
- `Cmd/Ctrl + K`: Open command palette
- `Cmd/Ctrl + S`: Save current form (if applicable)
- `Escape`: Close modals/dialogs
- `/`: Focus search

**Navigation Shortcuts**:
- `g + p`: Go to Profile
- `g + s`: Go to Security
- `g + i`: Go to Integrations
- `g + a`: Go to API Keys

**Implementation**:
- Create `useKeyboardShortcut` hook
- Show shortcuts in command palette
- Add "?" button to show shortcut legend

#### Step 5.3: Mobile Optimizations

**Changes**:
1. **Navigation**: Bottom sheet instead of sidebar
2. **Forms**: Full-width inputs, larger touch targets (44px min)
3. **Tables**: Horizontal scroll or card view
4. **Modals**: Full-screen on mobile
5. **Spacing**: Reduce padding on small screens

**Breakpoints**:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

#### Step 5.4: Accessibility Audit

**Checklist**:
- [ ] All interactive elements keyboard accessible
- [ ] Focus visible on all form controls
- [ ] ARIA labels on icon-only buttons
- [ ] Error messages associated with fields
- [ ] Skip links for main content
- [ ] Color contrast ratio 4.5:1 minimum
- [ ] Form validation errors announced
- [ ] Loading states announced
- [ ] Success confirmations announced

**Tools**: Use aXe DevTools, Lighthouse

#### Step 5.5: Performance Optimization

**Optimizations**:
1. **Code Splitting**: Dynamic import large components
2. **Image Optimization**: Use Next.js Image for avatars/logos
3. **Lazy Loading**: Load forms only when visible
4. **Debouncing**: All auto-save operations
5. **Memoization**: Expensive calculations
6. **Skeleton Loaders**: Prevent layout shift

**Metrics to Track**:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Cumulative Layout Shift (CLS)

---

### Phase 6: Testing & Refinement (Days 15-16)

#### Step 6.1: Visual Regression Testing

**Process**:
1. Take screenshots of all settings pages (before)
2. Implement redesign
3. Take screenshots (after)
4. Compare side-by-side
5. Fix inconsistencies

**Tools**: Percy, Chromatic, or manual

#### Step 6.2: User Acceptance Testing

**Test Scenarios**:
1. **Profile Update**: Change name, see auto-save, verify persistence
2. **Password Change**: Update password, verify validation
3. **API Key Creation**: Create, copy, verify in table
4. **Integration Setup**: Connect Slack, configure, test
5. **Dark Mode**: Toggle theme, verify all pages
6. **Mobile**: Navigate settings on phone, verify usability
7. **Keyboard**: Complete tasks with keyboard only

#### Step 6.3: Bug Fixes & Polish

**Common Issues to Check**:
- Form validation edge cases
- Auto-save race conditions
- Toast notification overflow
- Modal scroll behavior
- Mobile navigation glitches
- Dark mode color contrast
- Loading state flickers

---

## File-by-File Implementation Checklist

### Critical Files to Create

**New Component Files** (Priority Order):

1. ✓ `src/components/ui/button.tsx` (Shadcn install)
2. ✓ `src/components/ui/input.tsx` (Shadcn install)
3. ✓ `src/components/ui/switch.tsx` (Shadcn install)
4. ✓ `src/components/ui/select.tsx` (Shadcn install)
5. ✓ `src/components/ui/toast.tsx` (Shadcn install)
6. ✓ `src/components/ui/skeleton.tsx` (Shadcn install)
7. ✓ `src/components/ui/command.tsx` (Shadcn install)
8. ⚠️ `src/components/settings/forms/AutosaveForm.tsx` (NEW)
9. ⚠️ `src/components/settings/forms/FormField.tsx` (NEW)
10. ⚠️ `src/components/settings/feedback/SaveIndicator.tsx` (NEW)
11. ⚠️ `src/components/settings/feedback/LoadingState.tsx` (NEW)
12. ⚠️ `src/components/settings/shared/SettingsCommandPalette.tsx` (NEW)
13. ⚠️ `src/lib/hooks/use-autosave.ts` (NEW)
14. ⚠️ `src/lib/validations/profile.ts` (NEW - Zod schemas)

**Files to Refactor** (Priority Order):

1. 🔄 `src/components/settings/ProfileForm.tsx` (HIGH PRIORITY)
2. 🔄 `src/components/settings/PreferencesForm.tsx` (HIGH PRIORITY)
3. 🔄 `src/components/settings/SecurityForm.tsx` (HIGH PRIORITY)
4. 🔄 `src/components/settings/shared/SettingsNav.tsx` (HIGH PRIORITY)
5. 🔄 `src/components/settings/shared/SettingsRow.tsx` (HIGH PRIORITY)
6. 🔄 `src/components/settings/shared/SettingsSection.tsx` (MEDIUM)
7. 🔄 `src/components/settings/shared/SettingsLayout.tsx` (MEDIUM)
8. 🔄 `src/components/settings/NotificationProviderSettings.tsx` (MEDIUM)
9. 🔄 `src/components/settings/ApiKeysPanel.tsx` (MEDIUM)
10. 🔄 `src/app/(app)/settings/*/page.tsx` (ALL pages)

**Configuration Files**:

1. 🔧 `tailwind.config.ts` (UPDATE with design tokens)
2. 🔧 `components.json` (CREATE for Shadcn)
3. 🔧 `src/lib/utils.ts` (UPDATE with cn helper)

---

## Design Mockups & References

### Typography Scale
```
h1: 2.5rem (40px)  - Page titles
h2: 1.875rem (30px) - Section headers
h3: 1.5rem (24px)  - Subsection titles
body: 0.875rem (14px) - Base text
small: 0.8125rem (13px) - Secondary text
```

### Spacing Scale
```
xs: 4px
sm: 8px
md: 12px
lg: 16px
xl: 24px
2xl: 32px
3xl: 48px
4xl: 64px
```

### Color Palette (Light Mode)
```
Background: hsl(0 0% 100%)
Foreground: hsl(222 47% 11%)
Muted: hsl(210 40% 96%)
Border: hsl(214 32% 91%)
Primary: hsl(222 47% 11%)
Success: hsl(142 76% 36%)
Destructive: hsl(0 84% 60%)
```

### Component Heights
```
Input: 40px
Button (sm): 32px
Button (md): 36px
Button (lg): 40px
Switch: 24px
```

---

## Success Metrics

### User Experience
- ✓ All forms auto-save within 500ms
- ✓ Page transitions smooth (60fps)
- ✓ Loading states shown for operations >200ms
- ✓ Error messages clear and actionable
- ✓ Zero accessibility violations (aXe)

### Visual Quality
- ✓ Consistent spacing (design tokens used everywhere)
- ✓ Typography scale enforced
- ✓ Dark mode parity with light mode
- ✓ Responsive on all devices (320px - 4K)

### Performance
- ✓ LCP < 2.5s
- ✓ FID < 100ms
- ✓ CLS < 0.1
- ✓ Bundle size < 200KB (settings pages)

### Developer Experience
- ✓ All forms use same pattern (AutosaveForm)
- ✓ All inputs use same components (Shadcn)
- ✓ Type-safe validation (Zod)
- ✓ Reusable components documented

---

## Migration Strategy

### Incremental Rollout

**Week 1**: Foundation
- Install Shadcn, setup providers, create core components

**Week 2**: High-traffic pages
- Profile, Preferences, Security (most used)

**Week 3**: Admin pages
- Workspace, System, Custom Fields

**Week 4**: Integrations & Developer
- Integrations, API Keys, Notifications

**Week 5**: Polish
- Animations, keyboard shortcuts, accessibility

**Week 6**: Testing & Launch
- Bug fixes, UAT, production deploy

### Feature Flags (Optional)

Use feature flags to test new design:
```typescript
if (featureFlags.newSettingsUI) {
  return <NewProfilePage />
} else {
  return <OldProfilePage />
}
```

---

## Risk Mitigation

### Potential Issues

1. **Auto-save conflicts**: Race conditions with multiple rapid changes
   - **Solution**: Debounce + cancel previous requests

2. **Bundle size increase**: Shadcn components add size
   - **Solution**: Tree-shaking, dynamic imports

3. **Dark mode bugs**: Colors not defined for dark
   - **Solution**: Test every page in dark mode, use CSS variables

4. **Breaking changes**: Server Actions API changes
   - **Solution**: Maintain backward compatibility, feature flags

5. **Mobile regressions**: Touch targets too small
   - **Solution**: Min 44px touch targets, test on real devices

---

## Post-Launch

### Monitoring

**Track**:
- User engagement (time spent in settings)
- Error rates (form submission failures)
- Performance metrics (Core Web Vitals)
- User feedback (support tickets)

### Iteration

**Planned Enhancements**:
1. Settings search (Cmd+K) with AI suggestions
2. Recently changed settings widget
3. Export settings as JSON
4. Settings templates for teams
5. Audit log for all changes

---

## Conclusion

This redesign transforms OpsSentinal settings from functional but dated to **world-class and delightful**. By adopting modern tools (Shadcn, Radix, React Hook Form), implementing auto-save patterns, and focusing on polish, the settings experience will rival Linear, Vercel, and Stripe.

**Key Deliverables**:
- ✓ 30+ reusable Shadcn components
- ✓ Auto-save forms with optimistic updates
- ✓ Command palette for navigation
- ✓ Dark mode support
- ✓ Keyboard shortcuts
- ✓ Responsive design
- ✓ Skeleton loaders
- ✓ Toast notifications
- ✓ Comprehensive accessibility

**Estimated Timeline**: 16 days (3 weeks part-time)

**Estimated Impact**:
- 50% reduction in form errors
- 30% faster settings changes
- 90%+ user satisfaction
- Professional brand perception

Ready to build the best settings experience in the industry! 🚀
