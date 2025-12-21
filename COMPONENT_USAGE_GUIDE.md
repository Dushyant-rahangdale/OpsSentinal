# Component Usage Quick Reference

## 🚀 Quick Start

```tsx
import { Button, Input, Card, Badge, Spinner, Skeleton, Table, Modal, FormField, ErrorBoundary, ErrorState } from '@/components/ui';
```

---

## 📦 Components

### Button
```tsx
<Button variant="primary" size="md" isLoading={false} leftIcon={<Icon />}>
  Click Me
</Button>

// Variants: primary, secondary, danger, ghost, link
// Sizes: sm, md, lg
```

### Input
```tsx
<Input
  label="Email"
  type="email"
  error="Invalid email"
  helperText="Enter your email"
  leftIcon={<EmailIcon />}
  fullWidth
/>
```

### Card
```tsx
<Card variant="elevated" hover header={<h3>Title</h3>} footer={<button>Action</button>}>
  Content here
</Card>

// Variants: default, elevated, outlined, flat
```

### Badge
```tsx
<Badge variant="success" size="md" dot>
  Active
</Badge>

// Variants: default, primary, success, warning, error, info
// Sizes: sm, md, lg
```

### Spinner
```tsx
<Spinner size="md" variant="primary" />

// Sizes: sm, md, lg
// Variants: default, primary, white
```

### Skeleton
```tsx
<Skeleton variant="text" width="100%" />
<Skeleton variant="circular" width={40} height={40} />
<Skeleton variant="rectangular" width="100%" height={200} animation="wave" />

// Variants: text, circular, rectangular, rounded
// Animations: pulse, wave, none
```

### Table
```tsx
<Table
  columns={[
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email', render: (item) => <a href={`mailto:${item.email}`}>{item.email}</a> }
  ]}
  data={users}
  loading={isLoading}
  onRowClick={(item) => handleClick(item)}
/>
```

### Modal
```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  size="md"
  footer={<Button onClick={handleSave}>Save</Button>}
>
  Content here
</Modal>

// Sizes: sm, md, lg, xl, fullscreen
```

### FormField
```tsx
// Input
<FormField
  type="input"
  label="Name"
  inputType="text"
  required
  error={errors.name}
/>

// Textarea
<FormField
  type="textarea"
  label="Description"
  rows={4}
  helperText="Enter a description"
/>

// Select
<FormField
  type="select"
  label="Role"
  options={[
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'User' }
  ]}
/>
```

### ErrorBoundary
```tsx
<ErrorBoundary
  fallback={<ErrorState title="Error" message="Something went wrong" />}
  onError={(error, info) => console.error(error, info)}
>
  <YourComponent />
</ErrorBoundary>
```

### ErrorState
```tsx
<ErrorState
  title="Error"
  message="Something went wrong"
  errorCode="ERR_001"
  onRetry={() => window.location.reload()}
  onGoBack={() => router.back()}
  showDetails
  details={error.stack}
/>
```

---

## 🎨 Utility Classes

### Typography
```tsx
<div className="text-xl font-bold leading-tight">Heading</div>
<div className="text-sm text-muted">Subtitle</div>
```

### Spacing
```tsx
<div className="p-4 m-2 gap-3">Content</div>
<div className="px-6 py-4">Padding</div>
<div className="mx-auto my-8">Margin</div>
```

### Shadows
```tsx
<div className="shadow-lg">Elevated</div>
<div className="shadow-primary">Colored shadow</div>
```

### Border Radius
```tsx
<div className="rounded-lg">Rounded</div>
<div className="rounded-full">Circle</div>
```

---

## 🎯 Common Patterns

### Loading State
```tsx
{loading ? (
  <>
    <Skeleton variant="text" width="60%" />
    <Skeleton variant="text" width="80%" />
  </>
) : (
  <div>Content</div>
)}
```

### Form with Validation
```tsx
<form>
  <FormField
    type="input"
    label="Email"
    inputType="email"
    error={errors.email}
    required
    fullWidth
  />
  <Button type="submit" variant="primary" isLoading={isSubmitting}>
    Submit
  </Button>
</form>
```

### Error Handling
```tsx
<ErrorBoundary>
  {error ? (
    <ErrorState
      title="Failed to load"
      message={error.message}
      onRetry={refetch}
    />
  ) : (
    <Content />
  )}
</ErrorBoundary>
```

### Modal with Form
```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Create User"
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button variant="primary" onClick={handleSubmit}>Create</Button>
    </>
  }
>
  <FormField type="input" label="Name" required />
  <FormField type="input" label="Email" inputType="email" required />
</Modal>
```

---

## 📚 Design Tokens

### Colors
```css
var(--primary)
var(--color-success)
var(--color-warning)
var(--color-error)
var(--color-info)
var(--color-neutral-50) to var(--color-neutral-900)
```

### Spacing
```css
var(--spacing-1) to var(--spacing-24)
```

### Typography
```css
var(--font-size-xs) to var(--font-size-5xl)
var(--font-weight-light) to var(--font-weight-bold)
```

### Shadows
```css
var(--shadow-xs) to var(--shadow-2xl)
```

---

**For detailed documentation, see `IMPLEMENTATION_SUMMARY.md`**

