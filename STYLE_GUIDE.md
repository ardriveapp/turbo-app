# Turbo Gateway Style Guide

A comprehensive design system guide for maintaining visual consistency across the Turbo Gateway application.

---

## Table of Contents
1. [Color System](#color-system)
2. [Typography](#typography)
3. [Spacing & Layout](#spacing--layout)
4. [Component Patterns](#component-patterns)
5. [Button Styles](#button-styles)
6. [Form Elements](#form-elements)
7. [Icons & Visual Elements](#icons--visual-elements)
8. [Modal System](#modal-system)
9. [Navigation Patterns](#navigation-patterns)
10. [Responsive Design](#responsive-design)
11. [Animations & Transitions](#animations--transitions)
12. [Best Practices](#best-practices)

---

## Color System

### Base Colors (Dark Theme)
The application uses a **dark theme exclusively**. All colors are defined in `tailwind.config.js`.

#### Background Colors
```css
/* Main canvas background */
bg-canvas: #171717    /* Primary app background */
bg-surface: #1F1F1F   /* Elevated surfaces, cards, inputs */
bg-black: #000000     /* Absolute black for headers */
```

#### Text Colors
```css
/* Text hierarchy */
text-fg-muted: #ededed       /* Primary text - high contrast */
text-link: #A3A3AD           /* Secondary text, labels, less important info */
text-fg-disabled: #757575    /* Disabled state text */
text-high: #CACAD6          /* Highlighted text */
```

#### Border & Divider Colors
```css
border-default: #333         /* Standard borders */
border-default/20           /* Subtle borders (with opacity) */
border-default/50           /* Medium emphasis borders */
```

#### Brand Colors
```css
/* Primary brand color - use for accents, active states */
turbo-red: #FE0230

/* Supporting brand colors - use sparingly for specific contexts */
turbo-green: #18A957        /* Success states only */
turbo-blue: #3142C4         /* Informational elements (limited use) */
turbo-yellow: #FFBB38       /* ArNS/domain-related features */
turbo-purple: #8B5CF6       /* Developer/technical features */
```

#### Service-Specific Color Mapping
```typescript
// Credit/Payment Services → Gray/White theme
'topup', 'share', 'gift', 'balances', 'redeem', 'calculator'
  → Use: text-fg-muted, bg-fg-muted/20

// Upload/Deployment Services → Red theme
'upload', 'deploy'
  → Use: text-turbo-red, bg-turbo-red/20

// ArNS/Domain Services → Yellow theme
'domains'
  → Use: text-turbo-yellow, bg-turbo-yellow/20

// Developer/Technical Services → Purple theme
'developer', 'gateway-info'
  → Use: text-turbo-purple, bg-turbo-purple/20
```

#### Semantic Colors
```css
/* Status indicators */
success: text-turbo-green, bg-green-500/10, border-green-500/20
error: text-red-400, bg-red-500/10, border-red-500/20
warning: text-yellow-400, bg-yellow-500/10, border-yellow-500/20
info: text-blue-400, bg-blue-500/10, border-blue-500/20
```

### Color Usage Guidelines

**DO:**
- Use `turbo-red` for primary CTAs and important accents
- Use `text-fg-muted` for all primary readable text
- Use `text-link` for secondary text, labels, and metadata
- Apply transparency (`/10`, `/20`) for subtle backgrounds
- Use service-specific colors consistently within their context

**DON'T:**
- Mix brand colors indiscriminately
- Use light colors or create custom light themes
- Use pure white except for rare emphasis cases
- Rely on color alone for critical information (ensure accessibility)

---

## Typography

### Font Family
```css
/* Primary and only font */
font-family: 'Rubik', sans-serif;
```

Import weights in `globals.css`:
```css
@import '@fontsource/rubik/400.css';  /* Regular */
@import '@fontsource/rubik/500.css';  /* Medium */
@import '@fontsource/rubik/600.css';  /* Semibold */
@import '@fontsource/rubik/700.css';  /* Bold */
```

### Type Scale & Hierarchy

#### Headings
```jsx
{/* Page Title - Large emphasis */}
<h1 className="text-4xl font-bold text-fg-muted">Page Title</h1>

{/* Section Title - Panel headers */}
<h2 className="text-2xl font-bold text-fg-muted">Section Title</h2>

{/* Subsection */}
<h3 className="text-xl font-semibold text-fg-muted">Subsection</h3>

{/* Small Header */}
<h4 className="text-lg font-medium text-fg-muted">Small Header</h4>
```

#### Body Text
```jsx
{/* Primary body text */}
<p className="text-base text-fg-muted">Regular content text</p>

{/* Secondary/descriptive text */}
<p className="text-sm text-link">Descriptive or helper text</p>

{/* Small metadata/captions */}
<p className="text-xs text-link">Metadata, timestamps, captions</p>
```

#### Specialized Text
```jsx
{/* Labels - always uppercase with tracking */}
<label className="text-xs font-medium text-link uppercase tracking-wider">
  Field Label
</label>

{/* Monospace for addresses/IDs */}
<span className="font-mono text-sm text-fg-muted">
  {walletAddress}
</span>

{/* Numbers - tabular nums for alignment */}
<span className="font-medium text-fg-muted tabular-nums">
  1,234.56
</span>
```

### Font Weight Usage
- **400 (Regular)**: Standard body text
- **500 (Medium)**: Emphasized body text, button text
- **600 (Semibold)**: Section headers, important labels
- **700 (Bold)**: Page titles, primary headings, emphasized numbers

---

## Spacing & Layout

### Container System
```jsx
{/* Page-level max-width container - ALWAYS use this */}
<div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 w-full">
  {/* Content */}
</div>

{/* Responsive padding values */}
px-1     /* Mobile: minimal padding */
sm:px-6  /* Tablet: medium padding */
lg:px-8  /* Desktop: generous padding */
```

### Standard Spacing Scale
```css
/* Use Tailwind's spacing scale consistently */
gap-1 (4px)    /* Tight spacing, icon + text */
gap-2 (8px)    /* Close related elements */
gap-3 (12px)   /* Default spacing */
gap-4 (16px)   /* Comfortable spacing */
gap-6 (24px)   /* Section spacing */
gap-8 (32px)   /* Large section spacing */
gap-12 (48px)  /* Page section dividers */
```

### Margin & Padding Patterns
```jsx
{/* Card/Panel internal padding */}
<div className="p-4 sm:p-6">
  {/* Responsive: 16px mobile, 24px desktop */}
</div>

{/* Stack spacing (vertical) */}
<div className="space-y-4">  {/* 16px between children */}
  <div>Item 1</div>
  <div>Item 2</div>
</div>

{/* Inline spacing (horizontal) */}
<div className="flex items-center gap-2">
  <Icon />
  <span>Text</span>
</div>
```

### Layout Components

#### Sticky Header Pattern
```jsx
<div className="sticky top-0 z-50 bg-[#090909] border-b border-default/20">
  <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 w-full">
    <Header />
  </div>
</div>
```

#### Full Page Layout
```jsx
<div className="min-h-screen bg-black text-fg-muted flex flex-col">
  {/* Header */}
  <div className="sticky top-0 z-50">{/* ... */}</div>

  {/* Main Content */}
  <div className="flex-1">
    <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 w-full">
      <div className="pt-6 sm:pt-8 pb-3 sm:pb-4 mb-6 sm:mb-8">
        {/* Page content */}
      </div>
    </div>
  </div>

  {/* Footer */}
  <Footer />
</div>
```

---

## Component Patterns

### Service Panel Pattern (Universal Template)
**Every service panel MUST follow this exact structure:**

```jsx
<div className="px-4 sm:px-6">
  {/* 1. Inline Header with Icon */}
  <div className="flex items-start gap-3 mb-6">
    <div className="w-10 h-10 bg-turbo-red/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
      <IconComponent className="w-5 h-5 text-turbo-red" />
    </div>
    <div>
      <h3 className="text-2xl font-bold text-fg-muted mb-1">Service Name</h3>
      <p className="text-sm text-link">Brief service description</p>
    </div>
  </div>

  {/* 2. Main Content Container with Gradient */}
  <div className="bg-gradient-to-br from-turbo-red/5 to-turbo-red/3 rounded-xl border border-turbo-red/20 p-4 sm:p-6 mb-4 sm:mb-6">
    {/* Panel content goes here */}
  </div>
</div>
```

**Icon Background & Border Colors by Service:**
```jsx
// Credit services (topup, share, gift, balances, redeem, calculator)
Icon: bg-fg-muted/20, text-fg-muted
Border: border-default  OR  border-fg-muted/20
Gradient: from-fg-muted/5 to-fg-muted/3

// Upload/Deploy services (upload, deploy)
Icon: bg-turbo-red/20, text-turbo-red
Border: border-default  OR  border-turbo-red/20
Gradient: from-turbo-red/5 to-turbo-red/3

// ArNS/Domain services (domains)
Icon: bg-turbo-yellow/20, text-turbo-yellow
Border: border-default  OR  border-turbo-yellow/20
Gradient: from-turbo-yellow/5 to-turbo-yellow/3

// Developer services (developer, gateway-info)
Icon: bg-turbo-purple/20, text-turbo-purple
Border: border-default  OR  border-turbo-purple/20
Gradient: from-turbo-purple/5 to-turbo-purple/3
```

**Border Color Guidelines:**
- Use `border-default` for neutral, subtle borders (most common)
- Use `border-{service-color}/20` to emphasize service identity (optional enhancement)
- Both approaches are valid - choose based on desired visual prominence

### Card Components

#### Standard Card
```jsx
<div className="bg-surface rounded-lg border border-default p-4">
  <h3 className="text-lg font-semibold text-fg-muted mb-2">Card Title</h3>
  <p className="text-sm text-link">Card content</p>
</div>
```

#### Highlighted Card (for important info)
```jsx
<div className="bg-canvas border-2 border-fg-muted rounded-lg p-6">
  <div className="text-sm text-link mb-1">Label</div>
  <div className="text-4xl font-bold text-fg-muted mb-1">Main Value</div>
  <div className="text-sm text-link">Supporting info</div>
</div>
```

#### Alert/Message Cards
```jsx
{/* Success */}
<div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
  <div className="flex items-start gap-3">
    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
    <div>
      <p className="font-medium text-green-400 mb-1">Success Title</p>
      <p className="text-green-300 text-sm">Success message</p>
    </div>
  </div>
</div>

{/* Error */}
<div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
  <div className="flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
    <div>
      <p className="font-medium text-red-400 mb-1">Error Title</p>
      <p className="text-red-300 text-sm">Error message</p>
    </div>
  </div>
</div>

{/* Warning */}
<div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
  <div className="flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
    <div>
      <p className="font-medium text-yellow-400 mb-1">Warning Title</p>
      <p className="text-yellow-300 text-sm">Warning message</p>
    </div>
  </div>
</div>

{/* Info */}
<div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
  <div className="flex items-start gap-3">
    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
    <div>
      <p className="font-medium text-blue-400 mb-1">Info Title</p>
      <p className="text-blue-300 text-sm">Info message</p>
    </div>
  </div>
</div>
```

### Wallet Indicators
```jsx
{/* Wallet type indicator dot */}
<div className={`w-2 h-2 rounded-full ${
  walletType === 'arweave' ? 'bg-white' :
  walletType === 'ethereum' ? 'bg-blue-400' :
  walletType === 'solana' ? 'bg-purple-400' :
  'bg-green-500'
}`} />

{/* Profile avatar with fallback */}
<div className="size-8 rounded-full overflow-hidden bg-canvas border border-default/50 flex items-center justify-center">
  {/* Image or fallback indicator */}
</div>
```

---

## Button Styles

### Primary CTA Button
```jsx
<button className="w-full py-4 px-6 rounded-lg bg-fg-muted text-black font-bold text-lg hover:bg-fg-muted/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
  <Icon className="w-5 h-5" />
  Button Text
</button>
```

### Secondary Button
```jsx
<button className="py-3 px-4 rounded-lg border border-default text-link hover:bg-surface hover:text-fg-muted transition-colors font-medium">
  Secondary Action
</button>
```

### Preset Amount Buttons (Payment/Selection)
```jsx
{/* Standard preset */}
<button className={`py-3 px-3 rounded-lg border transition-all font-medium ${
  isSelected
    ? 'border-fg-muted bg-fg-muted/10 text-fg-muted'
    : 'border-default text-link hover:bg-surface hover:text-fg-muted'
}`}>
  $10
</button>
```

### Toggle Button Group
```jsx
<div className="inline-flex bg-surface rounded-lg p-1 border border-default">
  <button className={`px-4 py-3 rounded-md text-sm font-medium transition-all ${
    isActive
      ? 'bg-fg-muted text-black'
      : 'text-link hover:text-fg-muted'
  }`}>
    Option 1
  </button>
  <button className={`px-4 py-3 rounded-md text-sm font-medium transition-all ${
    isActive
      ? 'bg-fg-muted text-black'
      : 'text-link hover:text-fg-muted'
  }`}>
    Option 2
  </button>
</div>
```

### Icon Button
```jsx
<button className="p-1.5 text-link hover:text-fg-muted transition-colors" title="Action">
  <Icon className="w-4 h-4" />
</button>
```

### Destructive Button (Disconnect/Logout)
```jsx
<button className="px-6 py-3 font-semibold text-red-400 hover:bg-canvas hover:text-red-300 border-t border-default transition-colors">
  Disconnect
</button>
```

### Loading State
```jsx
<button disabled className="flex items-center gap-2">
  <Loader2 className="w-5 h-5 animate-spin" />
  Processing...
</button>
```

---

## Form Elements

### Standard Input Field
```jsx
<input
  type="text"
  className="w-full p-3 rounded-lg border border-default bg-canvas text-fg-muted focus:outline-none focus:border-fg-muted transition-colors"
  placeholder="Enter value"
/>
```

### Input with Error State
```jsx
<input
  className={`w-full p-3 rounded-lg border bg-canvas text-fg-muted focus:outline-none transition-colors ${
    hasError
      ? 'border-red-500 focus:border-red-500'
      : 'border-default focus:border-fg-muted'
  }`}
/>
{hasError && (
  <div className="mt-2 text-xs text-red-400">Error message</div>
)}
```

### FormEntry Component (Reusable)
```jsx
import FormEntry from './FormEntry';

<FormEntry
  name="fieldName"
  label="Field Label"
  errorText={error}
>
  <input
    type="text"
    id="fieldName"
    className="w-full p-3 bg-canvas text-fg-muted focus:outline-none"
  />
</FormEntry>
```

### Number Input with Custom Styling
```jsx
<div className="bg-surface rounded-lg p-4">
  <label className="block text-xs font-medium text-link mb-2 uppercase tracking-wider">
    Custom Amount (USD)
  </label>
  <div className="flex items-center gap-3">
    <DollarSign className="w-5 h-5 text-fg-muted" />
    <input
      type="text"
      className="flex-1 p-3 rounded-lg border border-default bg-canvas text-fg-muted font-medium text-lg focus:outline-none focus:border-fg-muted transition-colors"
      placeholder="Enter amount"
      inputMode="decimal"
    />
  </div>
  <div className="mt-2 text-xs text-link">
    Min: $5 • Max: $10,000
  </div>
</div>
```

### Dropdown (Headless UI Listbox)
```jsx
<Listbox value={selected} onChange={setSelected}>
  <div className="relative">
    <Listbox.Button className="relative w-full rounded-lg border border-default bg-canvas pl-4 pr-12 py-3 text-lg font-medium text-fg-muted focus:border-fg-muted focus:outline-none cursor-pointer text-left">
      <span className="block truncate">{selected.label}</span>
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
        <ChevronDown className="h-5 w-5 text-link" />
      </span>
    </Listbox.Button>

    <Transition
      as={Fragment}
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-surface border border-default shadow-lg focus:outline-none">
        {options.map((option) => (
          <Listbox.Option
            key={option.value}
            className={({ active }) =>
              `relative cursor-pointer select-none py-3 pl-4 pr-10 ${
                active ? 'bg-canvas text-fg-muted' : 'text-link'
              }`
            }
            value={option}
          >
            {({ selected }) => (
              <>
                <span className={`block truncate text-lg font-medium ${selected ? 'font-bold text-fg-muted' : ''}`}>
                  {option.label}
                </span>
                {selected && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-fg-muted">
                    <Check className="h-5 w-5" />
                  </span>
                )}
              </>
            )}
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </Transition>
  </div>
</Listbox>
```

---

## Icons & Visual Elements

### Icon Library
**Always use Lucide React** icons:
```jsx
import { Icon } from 'lucide-react';
```

### Icon Sizing Standards
```jsx
{/* Extra Small - 14px */}
<Icon className="w-3.5 h-3.5" />

{/* Small - 16px */}
<Icon className="w-4 h-4" />

{/* Medium - 20px (most common) */}
<Icon className="w-5 h-5" />

{/* Large - 24px */}
<Icon className="w-6 h-6" />

{/* Extra Large - 32px */}
<Icon className="w-8 h-8" />
```

### Icon Color Patterns
```jsx
{/* Default state */}
<Icon className="text-link" />

{/* Hover state */}
<Icon className="text-link hover:text-fg-muted" />

{/* Active/Selected state */}
<Icon className="text-fg-muted" />

{/* Brand accent */}
<Icon className="text-turbo-red" />

{/* Status icons */}
<Check className="text-turbo-green" />
<AlertCircle className="text-yellow-400" />
<XCircle className="text-red-400" />
<Info className="text-blue-400" />
```

### Copy Button Component
```jsx
import CopyButton from './CopyButton';

{/* Always use this for copyable content */}
<div className="flex items-center gap-2">
  <span className="font-mono text-sm text-fg-muted">{address}</span>
  <CopyButton textToCopy={address} />
</div>
```

### Loading Spinner
```jsx
<Loader2 className="w-5 h-5 animate-spin text-turbo-red" />
```

### Icon with Text Pattern
```jsx
<div className="flex items-center gap-2">
  <Icon className="w-4 h-4 text-link" />
  <span className="text-sm text-link">Label text</span>
</div>
```

---

## Modal System

### Base Modal Pattern
```jsx
import BaseModal from './modals/BaseModal';

<BaseModal onClose={handleClose} showCloseButton={false}>
  <div className="w-[500px] max-h-[80vh] overflow-auto p-6">
    {/* Modal content */}
  </div>
</BaseModal>
```

### Modal Z-Index Layers
```css
backdrop: z-[9998]
modal content: z-[9999]
```

### Modal Content Structure
```jsx
<BaseModal onClose={onClose}>
  <div className="w-[500px] p-6">
    {/* Header */}
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-fg-muted mb-2">Modal Title</h2>
      <p className="text-sm text-link">Modal description</p>
    </div>

    {/* Content */}
    <div className="space-y-4">
      {/* Modal body */}
    </div>

    {/* Actions */}
    <div className="flex gap-3 mt-6">
      <button className="flex-1 py-3 px-4 rounded-lg border border-default text-link hover:bg-surface hover:text-fg-muted transition-colors">
        Cancel
      </button>
      <button className="flex-1 py-3 px-4 rounded-lg bg-fg-muted text-black font-semibold hover:bg-fg-muted/90 transition-colors">
        Confirm
      </button>
    </div>
  </div>
</BaseModal>
```

### Modal Best Practices
- Always use `createPortal` to render to `document.body`
- Include backdrop with `onClick={onClose}` for dismissal
- Use fixed positioning with transform centering
- Limit content width: `w-[400px]`, `w-[500px]`, or `w-[600px]`
- Make modals scrollable for long content: `max-h-[80vh] overflow-auto`

---

## Navigation Patterns

### Waffle Menu (Headless UI Popover)
```jsx
<Popover className="relative">
  <PopoverButton className="flex items-center p-3 text-link hover:text-fg-muted transition-colors focus:outline-none">
    <Grid3x3 className="w-6 h-6" />
  </PopoverButton>

  <PopoverPanel className="absolute right-0 mt-2 w-64 overflow-auto rounded-lg bg-canvas border border-default shadow-lg z-50 py-1">
    {({ close }) => (
      <>
        {/* Section Header */}
        <div className="px-4 py-2 text-xs font-medium text-link uppercase tracking-wider">
          Section Name
        </div>

        {/* Menu Items */}
        <Link
          to="/path"
          onClick={() => close()}
          className={`flex items-center gap-3 py-2 px-4 text-sm transition-colors ${
            isActive
              ? 'bg-canvas text-fg-muted font-medium'
              : 'text-link hover:bg-canvas hover:text-fg-muted'
          }`}
        >
          <Icon className="w-4 h-4" />
          Menu Item
        </Link>

        {/* Divider */}
        <div className="border-t border-default my-1" />
      </>
    )}
  </PopoverPanel>
</Popover>
```

### Profile Dropdown Pattern
```jsx
<Popover className="relative">
  <PopoverButton className="flex items-center gap-2 rounded border border-default px-2 py-1.5 font-semibold hover:bg-canvas hover:border-fg-muted/50 transition-colors">
    {/* Avatar/indicator */}
    <div className="w-2 h-2 rounded-full bg-white" />
    <span className="text-fg-muted">{displayName}</span>
  </PopoverButton>

  <PopoverPanel className="absolute right-0 mt-4 flex flex-col rounded-lg bg-canvas text-sm shadow-lg border border-default min-w-[280px] z-50">
    {/* Sections with borders */}
    <div className="px-6 py-4 border-b border-default">
      {/* Section content */}
    </div>
  </PopoverPanel>
</Popover>
```

### React Router Navigation
```jsx
// Page navigation
import { Link } from 'react-router-dom';

<Link to="/path" className="text-link hover:text-fg-muted transition-colors">
  Link Text
</Link>

// Programmatic navigation
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/path');
```

---

## Responsive Design

### Breakpoint System (Tailwind)
```css
/* Mobile first approach */
default    /* < 640px */
sm:       /* ≥ 640px (tablet) */
md:       /* ≥ 768px */
lg:       /* ≥ 1024px (desktop) */
xl:       /* ≥ 1280px */
2xl:      /* ≥ 1536px */
```

### Common Responsive Patterns

#### Responsive Padding
```jsx
<div className="px-1 sm:px-6 lg:px-8">
  {/* 4px mobile, 24px tablet, 32px desktop */}
</div>
```

#### Responsive Typography
```jsx
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  {/* Scales with viewport */}
</h1>
```

#### Responsive Grid
```jsx
{/* 1 column mobile, 2 tablet, 3 desktop */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <div key={item.id}>{item.content}</div>)}
</div>
```

#### Responsive Flex Direction
```jsx
<div className="flex flex-col sm:flex-row gap-4">
  {/* Stack on mobile, row on tablet+ */}
</div>
```

#### Responsive Visibility
```jsx
{/* Hide on mobile, show on tablet+ */}
<div className="hidden sm:block">Desktop only</div>

{/* Show on mobile, hide on tablet+ */}
<div className="block sm:hidden">Mobile only</div>
```

### Mobile-First Guidelines
1. Design for mobile (320px) first
2. Add complexity at larger breakpoints
3. Test at key sizes: 375px (mobile), 768px (tablet), 1440px (desktop)
4. Use touch-friendly tap targets (min 44x44px)
5. Ensure readable text without zooming (min 16px font)

---

## Animations & Transitions

### Standard Transitions
```jsx
{/* Default transition for interactive elements */}
className="transition-colors duration-200"

{/* Hover states */}
className="hover:bg-surface hover:text-fg-muted transition-colors"
```

### Loading States
```jsx
{/* Spinner */}
<Loader2 className="w-5 h-5 animate-spin" />

{/* Pulsing indicator */}
<div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
```

### Custom Animations (in globals.css)
```css
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

### Headless UI Transitions
```jsx
<Transition
  as={Fragment}
  enter="transition ease-out duration-200"
  enterFrom="opacity-0"
  enterTo="opacity-100"
  leave="transition ease-in duration-150"
  leaveFrom="opacity-100"
  leaveTo="opacity-0"
>
  {/* Animated content */}
</Transition>
```

### Animation Best Practices
- Keep animations subtle and fast (150-300ms)
- Use `transition-colors` for color changes
- Use `transition-all` only when necessary
- Always provide `prefers-reduced-motion` fallbacks
- Avoid layout shift during animations

---

## Best Practices

### Component Creation Checklist
- [ ] Follow service panel pattern for consistency
- [ ] Use correct service color (red/yellow/purple/gray)
- [ ] Include proper responsive padding (`px-4 sm:px-6`)
- [ ] Implement loading states for async operations
- [ ] Add error states with user-friendly messages
- [ ] Include copy buttons for addresses/IDs
- [ ] Test with all wallet types (Arweave, Ethereum, Solana)
- [ ] Ensure mobile responsiveness (test at 375px)
- [ ] Add proper TypeScript types
- [ ] Follow accessibility guidelines

### Accessibility Guidelines
1. **Semantic HTML**: Use proper heading hierarchy
2. **Focus States**: Always visible with `focus:outline-none focus:ring-2`
3. **ARIA Labels**: Add for icon-only buttons
4. **Keyboard Navigation**: Support Tab, Enter, Escape
5. **Color Contrast**: Minimum 4.5:1 for text
6. **Alt Text**: Descriptive for all images
7. **Screen Readers**: Test with VoiceOver/NVDA

### Code Style Conventions
```jsx
// ✅ DO: Use consistent className ordering
<div className="flex items-center gap-2 p-4 bg-surface text-fg-muted rounded-lg border border-default hover:bg-canvas transition-colors">

// ❌ DON'T: Random className order
<div className="bg-surface gap-2 border-default flex rounded-lg p-4 items-center text-fg-muted">
```

**Recommended className order:**
1. Layout (flex, grid, block)
2. Positioning (relative, absolute)
3. Sizing (w-, h-, min-, max-)
4. Spacing (p-, m-, gap-)
5. Typography (text-, font-)
6. Colors (bg-, text-, border-)
7. Effects (rounded-, shadow-)
8. Transitions (transition-, hover:)
9. State (disabled:, focus:)

### Common Pitfalls to Avoid
- ❌ Don't create custom light themes
- ❌ Don't mix different icon libraries
- ❌ Don't use inline styles except for dynamic values
- ❌ Don't skip responsive breakpoints
- ❌ Don't use `any` type in TypeScript
- ❌ Don't forget loading/error states
- ❌ Don't hardcode colors (use Tailwind classes)
- ❌ Don't skip the service panel pattern

### Testing Checklist
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test at 375px, 768px, 1440px, 1920px
- [ ] Test with keyboard navigation only
- [ ] Test with screen reader
- [ ] Test all interactive states (hover, focus, active, disabled)
- [ ] Test error handling paths
- [ ] Test with slow network (loading states)
- [ ] Test with all three wallet types

---

## Quick Reference

### Essential Classes
```css
/* Containers */
.max-w-7xl.mx-auto.px-1.sm:px-6.lg:px-8.w-full

/* Text */
.text-fg-muted (primary)
.text-link (secondary)
.text-xs.font-medium.text-link.uppercase.tracking-wider (labels)

/* Buttons */
.py-4.px-6.rounded-lg.bg-fg-muted.text-black.font-bold (primary CTA)
.border.border-default.text-link.hover:bg-surface (secondary)

/* Cards */
.bg-surface.rounded-lg.border.border-default.p-4
.bg-gradient-to-br.from-turbo-red/5.to-turbo-red/3 (panel gradient)

/* Inputs */
.w-full.p-3.rounded-lg.border.border-default.bg-canvas.text-fg-muted

/* Spacing */
.space-y-4 (vertical stack)
.flex.items-center.gap-2 (horizontal inline)
```

### Component Imports
```jsx
import { Icon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Popover, PopoverButton, PopoverPanel, Listbox, Transition } from '@headlessui/react';
import CopyButton from './CopyButton';
import BaseModal from './modals/BaseModal';
import FormEntry from './FormEntry';
```

---

**Last Updated**: Based on v0.4.5 codebase analysis

For questions or clarifications, refer to existing components in `src/components/panels/` for working examples.
