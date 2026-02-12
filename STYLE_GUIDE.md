# ar.io App Style Guide

A comprehensive design system guide for maintaining visual consistency across the ar.io application, aligned with the ar.io Network brand identity.

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

### Brand Colors

The ar.io brand uses a refined, minimal color palette:

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| **Primary** | `#5427C8` | `--color-primary` | CTAs, links, accents, interactive elements |
| **Lavender** | `#DFD6F7` | `--color-lavender` | Gradients, backgrounds, footer, decorative |
| **Black** | `#23232D` | `--color-foreground` | Primary text, dark UI elements |
| **White** | `#FFFFFF` | `--color-background` | Page background, light text on dark |
| **Card Surface** | `#F0F0F0` | `--color-card` | Card backgrounds, elevated surfaces |

### Semantic Color Tokens

Define these in `globals.css` and reference in `tailwind.config.js`:

```css
:root {
  /* Core brand colors */
  --color-primary: 84 39 200;        /* #5427C8 */
  --color-lavender: 223 214 247;     /* #DFD6F7 */
  --color-foreground: 35 35 45;      /* #23232D */
  --color-background: 255 255 255;   /* #FFFFFF */
  --color-card: 240 240 240;         /* #F0F0F0 */

  /* Derived tokens */
  --color-border: 35 35 45;          /* Same as foreground, used with opacity */
  --color-muted-foreground: 35 35 45; /* Text at reduced opacity */
  --color-accent: 84 39 200;         /* Same as primary, used with opacity for hover states */
}
```

### Tailwind Color Classes

```css
/* Backgrounds */
bg-background          /* #FFFFFF - page background */
bg-card                /* #F0F0F0 - card surfaces, elevated elements */
bg-lavender            /* #DFD6F7 - decorative backgrounds, footer */
bg-primary             /* #5427C8 - accent backgrounds (use sparingly) */
bg-foreground          /* #23232D - dark backgrounds, inverted sections */

/* Text */
text-foreground        /* #23232D - primary text */
text-foreground/80     /* Primary text at 80% - secondary text */
text-foreground/60     /* Primary text at 60% - muted/helper text */
text-primary           /* #5427C8 - links, accents */
text-white             /* #FFFFFF - text on dark backgrounds */

/* Borders */
border-border          /* #23232D at 12% opacity - standard borders */
border-primary/30      /* Purple border for emphasis */
border-primary/50      /* Purple border on hover */
```

### Opacity Usage Guidelines

Use opacity modifiers to create visual hierarchy without introducing new colors:

| Opacity | Usage |
|---------|-------|
| `/10` | Very subtle backgrounds, hover states |
| `/15` | Pill backgrounds, light accents |
| `/25` | Hover state backgrounds |
| `/30` | Subtle borders, card overlays |
| `/50` | Medium emphasis borders |
| `/60` | Muted text |
| `/70` | Backdrop overlays |
| `/80` | Secondary text |

### Status Colors

For success, error, warning, and info states, use standard semantic colors:

```css
/* Success */
text-green-600, bg-green-500/10, border-green-500/20

/* Error */
text-red-600, bg-red-500/10, border-red-500/20

/* Warning */
text-amber-600, bg-amber-500/10, border-amber-500/20

/* Info */
text-blue-600, bg-blue-500/10, border-blue-500/20
```

### Color Usage Guidelines

**DO:**
- Use `bg-background` for page backgrounds
- Use `bg-card` for cards and elevated surfaces
- Use `bg-lavender` sparingly for decorative sections (footer, hero accents)
- Use `text-foreground` for all primary readable text
- Use `text-foreground/80` for secondary text
- Use `bg-primary/15` for subtle accent backgrounds (pills, badges)
- Apply opacity modifiers for visual depth

**DON'T:**
- Overuse the primary purple - reserve for CTAs and key interactive elements
- Use hardcoded hex values - always use semantic tokens
- Create new accent colors - the palette is intentionally minimal
- Use `bg-primary` for large areas - it should accent, not dominate

---

## Typography

### Font Families

The ar.io brand uses two typefaces:

```css
/* Heading font - Besley */
font-family: 'Besley', serif;
--font-heading: 'Besley', serif;

/* Body font - Plus Jakarta Sans */
font-family: 'Plus Jakarta Sans', sans-serif;
--font-body: 'Plus Jakarta Sans', sans-serif;
```

### Font Installation

Add to your project via `@fontsource` or Google Fonts:

```css
/* In globals.css */
@import '@fontsource-variable/besley';
@import '@fontsource-variable/plus-jakarta-sans';
```

Or download the variable font files:
- `Besley-VariableFont_wght.ttf`
- `PlusJakartaSans-VariableFont_wght.ttf`

### Type Scale & Hierarchy

#### Headings (Besley, Extra Bold)
```jsx
{/* Page Title - Hero/Landing */}
<h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-foreground">
  Page Title
</h1>

{/* Section Title */}
<h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">
  Section Title
</h2>

{/* Subsection */}
<h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
  Subsection
</h3>

{/* Small Header */}
<h4 className="font-heading text-lg font-bold text-foreground">
  Small Header
</h4>
```

#### Body Text (Plus Jakarta Sans)
```jsx
{/* Primary body text */}
<p className="font-body text-base text-foreground">
  Regular content text
</p>

{/* Secondary/descriptive text */}
<p className="font-body text-sm text-foreground/80">
  Descriptive or helper text
</p>

{/* Small metadata/captions */}
<p className="font-body text-xs text-foreground/60">
  Metadata, timestamps, captions
</p>
```

#### Specialized Text
```jsx
{/* Labels */}
<label className="font-body text-xs font-semibold text-foreground/80 uppercase tracking-wider">
  Field Label
</label>

{/* Monospace for addresses/IDs */}
<span className="font-mono text-sm text-foreground">
  {walletAddress}
</span>

{/* Numbers - tabular nums for alignment */}
<span className="font-body font-semibold text-foreground tabular-nums">
  1,234.56
</span>
```

### Font Weight Usage
- **400 (Regular)**: Standard body text
- **500 (Medium)**: Emphasized body text, UI labels
- **600 (Semibold)**: Button text, important labels
- **700 (Bold)**: Subheadings
- **800 (Extra Bold)**: Headings (Besley only)

---

## Spacing & Layout

### Container System
```jsx
{/* Page-level max-width container */}
<div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>

{/* Narrower content container */}
<div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

### Standard Spacing Scale
```css
/* Use Tailwind's spacing scale consistently */
gap-1 (4px)    /* Tight spacing, icon + text */
gap-2 (8px)    /* Close related elements */
gap-3 (12px)   /* Default inline spacing */
gap-4 (16px)   /* Comfortable spacing */
gap-6 (24px)   /* Section spacing */
gap-8 (32px)   /* Large section spacing */
gap-12 (48px)  /* Page section dividers */
```

### Margin & Padding Patterns
```jsx
{/* Card/Panel internal padding */}
<div className="p-6 sm:p-8">
  {/* Responsive: 24px mobile, 32px desktop */}
</div>

{/* Stack spacing (vertical) */}
<div className="space-y-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

{/* Inline spacing (horizontal) */}
<div className="flex items-center gap-2">
  <Icon />
  <span>Text</span>
</div>
```

### Border Radius Standards

ar.io uses generous, rounded corners:

```css
rounded-full   /* Pills, buttons, badges, avatars */
rounded-3xl    /* Large hero sections (1.5rem) */
rounded-2xl    /* Cards, modals, dropdowns (1rem) */
rounded-xl     /* Smaller cards, inputs (0.75rem) */
rounded-lg     /* Buttons, small elements (0.5rem) */
```

**Border Radius Guidelines:**
- `rounded-full` - Primary CTAs, pills, badges, profile avatars
- `rounded-2xl` - Cards, modal dialogs, dropdown menus
- `rounded-xl` - Input fields, secondary buttons, nested cards
- `rounded-lg` - Small interactive elements

---

## Component Patterns

### Service Panel Pattern

All service panels follow a consistent structure:

```jsx
<div className="px-4 sm:px-6">
  {/* 1. Panel Header */}
  <div className="flex items-start gap-3 mb-6">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card">
      <IconComponent className="h-5 w-5 text-foreground" />
    </div>
    <div>
      <h3 className="font-heading text-2xl font-extrabold text-foreground mb-1">
        Service Name
      </h3>
      <p className="font-body text-sm text-foreground/80">
        Brief service description
      </p>
    </div>
  </div>

  {/* 2. Main Content Card */}
  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
    {/* Panel content */}
  </div>
</div>
```

### Card Components

#### Standard Card
```jsx
<div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
  <h3 className="font-heading text-lg font-bold text-foreground mb-2">
    Card Title
  </h3>
  <p className="font-body text-sm text-foreground/80">
    Card content
  </p>
</div>
```

#### Interactive Card (with hover)
```jsx
<div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
  {/* Card content */}
</div>
```

#### Card with Gradient Overlay
```jsx
<div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
  {/* Subtle gradient overlay */}
  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/10" />
  <div className="relative">
    {/* Card content */}
  </div>
</div>
```

#### Highlighted Card (for important info)
```jsx
<div className="rounded-2xl border-2 border-primary/30 bg-card p-6">
  <div className="text-sm text-foreground/80 mb-1">Label</div>
  <div className="font-heading text-4xl font-extrabold text-foreground mb-1">
    Main Value
  </div>
  <div className="text-sm text-foreground/60">Supporting info</div>
</div>
```

#### Alert/Message Cards
```jsx
{/* Success */}
<div className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
  <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600 mt-0.5" />
  <div>
    <p className="font-semibold text-green-600 mb-1">Success Title</p>
    <p className="text-sm text-green-600/80">Success message</p>
  </div>
</div>

{/* Error */}
<div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
  <div>
    <p className="font-semibold text-red-600 mb-1">Error Title</p>
    <p className="text-sm text-red-600/80">Error message</p>
  </div>
</div>

{/* Warning */}
<div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
  <div>
    <p className="font-semibold text-amber-600 mb-1">Warning Title</p>
    <p className="text-sm text-amber-600/80">Warning message</p>
  </div>
</div>

{/* Info */}
<div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
  <Info className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" />
  <div>
    <p className="font-semibold text-blue-600 mb-1">Info Title</p>
    <p className="text-sm text-blue-600/80">Info message</p>
  </div>
</div>
```

---

## Button Styles

### Primary CTA Button (Dark)
The main call-to-action uses a pill shape with dark background:

```jsx
<button className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
  <Icon className="h-4 w-4" />
  Button Text
</button>
```

### Primary CTA Button (Large)
For hero sections and prominent actions:

```jsx
<button className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 font-body text-base font-semibold text-white transition-opacity hover:opacity-90">
  <Icon className="h-5 w-5" />
  Get Started
</button>
```

### Secondary Button (Outlined)
```jsx
<button className="inline-flex items-center justify-center gap-2 rounded-full border border-foreground bg-transparent px-5 py-2.5 font-body text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5">
  Secondary Action
</button>
```

### Tertiary Button (Ghost)
```jsx
<button className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-body text-sm font-medium text-foreground/80 transition-colors hover:bg-card hover:text-foreground">
  Tertiary Action
</button>
```

### Pill Button (Navigation/Filter)
```jsx
<button className={`rounded-full px-4 py-2 font-body text-sm transition-colors ${
  isActive
    ? 'bg-primary/15 text-foreground font-medium'
    : 'text-foreground/80 hover:bg-primary/10'
}`}>
  Filter Option
</button>
```

### Toggle Button Group
```jsx
<div className="inline-flex rounded-full bg-card p-1 border border-border">
  <button className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
    isActive
      ? 'bg-foreground text-white'
      : 'text-foreground/80 hover:text-foreground'
  }`}>
    Option 1
  </button>
  <button className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
    isActive
      ? 'bg-foreground text-white'
      : 'text-foreground/80 hover:text-foreground'
  }`}>
    Option 2
  </button>
</div>
```

### Icon Button
```jsx
<button className="p-2 text-foreground/60 transition-colors hover:text-foreground" title="Action">
  <Icon className="h-5 w-5" />
</button>
```

### Destructive Button
```jsx
<button className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/30 bg-transparent px-5 py-2.5 font-body text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/10">
  Disconnect
</button>
```

### Loading State
```jsx
<button disabled className="inline-flex items-center gap-2 opacity-50">
  <Loader2 className="h-4 w-4 animate-spin" />
  Processing...
</button>
```

---

## Form Elements

### Standard Input Field
```jsx
<input
  type="text"
  className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none transition-colors"
  placeholder="Enter value"
/>
```

### Input with Label
```jsx
<div className="space-y-2">
  <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider">
    Field Label
  </label>
  <input
    type="text"
    className="w-full rounded-xl border border-border bg-background px-4 py-3 font-body text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none transition-colors"
    placeholder="Enter value"
  />
</div>
```

### Input with Error State
```jsx
<div className="space-y-2">
  <input
    className={`w-full rounded-xl border bg-background px-4 py-3 font-body text-foreground focus:outline-none transition-colors ${
      hasError
        ? 'border-red-500 focus:border-red-500'
        : 'border-border focus:border-primary'
    }`}
  />
  {hasError && (
    <p className="text-xs text-red-600">Error message</p>
  )}
</div>
```

### Input on Card Surface
When placing inputs on `bg-card` surfaces, use `bg-background` for contrast:

```jsx
<div className="rounded-2xl bg-card p-6">
  <input
    type="text"
    className="w-full rounded-xl border border-border bg-background px-4 py-3 ..."
  />
</div>
```

### Number Input with Icon
```jsx
<div className="space-y-2">
  <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wider">
    Amount (USD)
  </label>
  <div className="relative">
    <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
    <input
      type="text"
      inputMode="decimal"
      className="w-full rounded-xl border border-border bg-background pl-12 pr-4 py-3 font-body text-lg font-semibold text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none transition-colors"
      placeholder="0.00"
    />
  </div>
  <p className="text-xs text-foreground/60">Min: $5 | Max: $10,000</p>
</div>
```

### Dropdown (Headless UI Listbox)
```jsx
<Listbox value={selected} onChange={setSelected}>
  <div className="relative">
    <Listbox.Button className="relative w-full rounded-xl border border-border bg-background py-3 pl-4 pr-12 text-left font-body text-foreground focus:border-primary focus:outline-none cursor-pointer transition-colors">
      <span className="block truncate">{selected.label}</span>
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
        <ChevronDown className="h-5 w-5 text-foreground/40" />
      </span>
    </Listbox.Button>

    <Transition
      as={Fragment}
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <Listbox.Options className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-border bg-background shadow-lg focus:outline-none">
        {options.map((option) => (
          <Listbox.Option
            key={option.value}
            className={({ active }) =>
              `relative cursor-pointer select-none px-4 py-3 transition-colors ${
                active ? 'bg-primary/10' : ''
              }`
            }
            value={option}
          >
            {({ selected }) => (
              <>
                <span className={`block truncate ${selected ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                  {option.label}
                </span>
                {selected && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary">
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
**Use Lucide React** for all icons:
```jsx
import { Icon } from 'lucide-react';
```

### Icon Sizing Standards
```jsx
{/* Small - 16px */}
<Icon className="h-4 w-4" />

{/* Medium - 20px (most common) */}
<Icon className="h-5 w-5" />

{/* Large - 24px */}
<Icon className="h-6 w-6" />

{/* Extra Large - 32px */}
<Icon className="h-8 w-8" />
```

### Icon Color Patterns
```jsx
{/* Default state */}
<Icon className="text-foreground/60" />

{/* Hover state */}
<Icon className="text-foreground/60 hover:text-foreground transition-colors" />

{/* Active/Selected state */}
<Icon className="text-foreground" />

{/* Primary accent */}
<Icon className="text-primary" />

{/* Status icons */}
<Check className="text-green-600" />
<AlertCircle className="text-amber-600" />
<XCircle className="text-red-600" />
<Info className="text-blue-600" />
```

### Copy Button Component
```jsx
import CopyButton from './CopyButton';

<div className="flex items-center gap-2">
  <span className="font-mono text-sm text-foreground">{address}</span>
  <CopyButton textToCopy={address} />
</div>
```

### Loading Spinner
```jsx
<Loader2 className="h-5 w-5 animate-spin text-primary" />
```

### Icon with Text Pattern
```jsx
<div className="flex items-center gap-2">
  <Icon className="h-4 w-4 text-foreground/60" />
  <span className="text-sm text-foreground/80">Label text</span>
</div>
```

### ar.io Logo Usage

Use the appropriate logo variant based on background:

```jsx
{/* On light backgrounds */}
<img src="/brand/ario-full-black.svg" alt="ar.io" className="h-8" />

{/* On dark backgrounds */}
<img src="/brand/ario-full-white.svg" alt="ar.io" className="h-8" />

{/* Icon only */}
<img src="/brand/ario-black.svg" alt="ar.io" className="h-6 w-6" />
```

---

## Modal System

### Base Modal Pattern
```jsx
import BaseModal from './modals/BaseModal';

<BaseModal onClose={handleClose}>
  <div className="w-full max-w-lg overflow-auto rounded-2xl border border-border bg-background p-6 shadow-2xl">
    {/* Modal content */}
  </div>
</BaseModal>
```

### Modal Overlay
```jsx
{/* Backdrop */}
<div className="fixed inset-0 z-[9998] bg-black/70 transition-opacity duration-200" />

{/* Content container */}
<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
  {/* Modal */}
</div>
```

### Modal Content Structure
```jsx
<BaseModal onClose={onClose}>
  <div className="w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl">
    {/* Header */}
    <div className="border-b border-border p-6">
      <h2 className="font-heading text-xl font-bold text-foreground">
        Modal Title
      </h2>
      <p className="mt-1 text-sm text-foreground/80">
        Modal description
      </p>
    </div>

    {/* Content */}
    <div className="max-h-[60vh] overflow-auto p-6">
      {/* Modal body */}
    </div>

    {/* Actions */}
    <div className="flex gap-3 border-t border-border p-6">
      <button className="flex-1 rounded-full border border-foreground bg-transparent px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5">
        Cancel
      </button>
      <button className="flex-1 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
        Confirm
      </button>
    </div>
  </div>
</BaseModal>
```

---

## Navigation Patterns

### Header
```jsx
<header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
  <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
    {/* Logo */}
    <img src="/brand/ario-full-black.svg" alt="ar.io" className="h-8" />

    {/* Navigation */}
    <nav className="flex items-center gap-2">
      {/* Nav items */}
    </nav>
  </div>
</header>
```

### Navigation Pills
```jsx
<nav className="flex items-center gap-1">
  <Link
    to="/path"
    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary/15 text-foreground'
        : 'text-foreground/80 hover:bg-primary/10 hover:text-foreground'
    }`}
  >
    Nav Item
  </Link>
</nav>
```

### Dropdown Menu (Popover)
```jsx
<Popover className="relative">
  <PopoverButton className="flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/25">
    Menu
    <ChevronDown className="h-4 w-4" />
  </PopoverButton>

  <PopoverPanel className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-background shadow-lg">
    {({ close }) => (
      <div className="p-2">
        <Link
          to="/path"
          onClick={() => close()}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-foreground transition-colors hover:bg-primary/10"
        >
          <Icon className="h-5 w-5 text-foreground/60" />
          Menu Item
        </Link>
      </div>
    )}
  </PopoverPanel>
</Popover>
```

### Profile Dropdown
```jsx
<Popover className="relative">
  <PopoverButton className="flex items-center gap-2 rounded-full border border-border px-3 py-2 transition-colors hover:border-foreground/30 hover:bg-card">
    <div className="h-6 w-6 rounded-full bg-primary/20" />
    <span className="text-sm font-medium text-foreground">{displayName}</span>
    <ChevronDown className="h-4 w-4 text-foreground/60" />
  </PopoverButton>

  <PopoverPanel className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-background shadow-lg">
    {/* Profile sections */}
  </PopoverPanel>
</Popover>
```

### Footer
```jsx
<footer className="bg-lavender">
  <div className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {/* Footer columns */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Section Title
        </h3>
        <ul className="space-y-2">
          <li>
            <Link className="text-sm text-foreground/80 transition-colors hover:text-foreground">
              Link
            </Link>
          </li>
        </ul>
      </div>
    </div>
  </div>
</footer>
```

---

## Responsive Design

### Breakpoint System (Tailwind)
```css
default    /* < 640px - Mobile */
sm:        /* >= 640px - Large mobile/small tablet */
md:        /* >= 768px - Tablet */
lg:        /* >= 1024px - Desktop */
xl:        /* >= 1280px - Large desktop */
2xl:       /* >= 1536px - Extra large */
```

### Common Responsive Patterns

#### Responsive Container
```jsx
<div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

#### Responsive Typography
```jsx
<h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold">
  {/* Scales with viewport */}
</h1>
```

#### Responsive Grid
```jsx
{/* 1 column mobile, 2 tablet, 3 desktop */}
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <Card key={item.id} />)}
</div>
```

#### Responsive Flex Direction
```jsx
<div className="flex flex-col gap-4 sm:flex-row">
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
1. Design for mobile (375px) first
2. Add complexity at larger breakpoints
3. Test at: 375px, 768px, 1024px, 1440px
4. Touch-friendly tap targets (min 44x44px)
5. Readable text without zooming (min 16px body)

---

## Animations & Transitions

### Standard Transitions
```jsx
{/* Color transitions (most common) */}
className="transition-colors duration-200"

{/* Opacity transitions */}
className="transition-opacity duration-200"

{/* All properties (use sparingly) */}
className="transition-all duration-200"
```

### Hover States
```jsx
{/* Opacity change */}
className="hover:opacity-90"

{/* Background change */}
className="hover:bg-primary/10"

{/* Lift effect */}
className="hover:-translate-y-0.5 hover:shadow-md"

{/* Border emphasis */}
className="hover:border-primary/30"
```

### Loading States
```jsx
{/* Spinner */}
<Loader2 className="h-5 w-5 animate-spin" />

{/* Pulsing indicator */}
<div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
```

### Headless UI Transitions
```jsx
<Transition
  as={Fragment}
  enter="transition ease-out duration-200"
  enterFrom="opacity-0 translate-y-1"
  enterTo="opacity-100 translate-y-0"
  leave="transition ease-in duration-150"
  leaveFrom="opacity-100 translate-y-0"
  leaveTo="opacity-0 translate-y-1"
>
  {/* Animated content */}
</Transition>
```

### Animation Best Practices
- Keep animations subtle and fast (150-200ms)
- Use `ease-out` for enters, `ease-in` for exits
- Prefer `transition-colors` or `transition-opacity` over `transition-all`
- Respect `prefers-reduced-motion`

---

## Best Practices

### Component Creation Checklist
- [ ] Follow service panel pattern for consistency
- [ ] Use semantic color tokens (not hardcoded hex)
- [ ] Include proper responsive padding
- [ ] Implement loading states for async operations
- [ ] Add error states with user-friendly messages
- [ ] Include copy buttons for addresses/IDs
- [ ] Test with all wallet types (Arweave, Ethereum, Solana)
- [ ] Ensure mobile responsiveness (test at 375px)
- [ ] Add proper TypeScript types
- [ ] Follow accessibility guidelines

### Accessibility Guidelines
1. **Semantic HTML**: Use proper heading hierarchy
2. **Focus States**: Visible focus with `focus:outline-none focus:ring-2 focus:ring-primary`
3. **ARIA Labels**: Add for icon-only buttons
4. **Keyboard Navigation**: Support Tab, Enter, Escape
5. **Color Contrast**: Minimum 4.5:1 for text (WCAG AA)
6. **Alt Text**: Descriptive for all images

### Code Style Conventions
```jsx
// Recommended className order:
// 1. Layout (flex, grid, block)
// 2. Positioning (relative, absolute)
// 3. Sizing (w-, h-, min-, max-)
// 4. Spacing (p-, m-, gap-)
// 5. Typography (font-, text-)
// 6. Colors (bg-, text-, border-)
// 7. Effects (rounded-, shadow-)
// 8. Transitions (transition-, hover:)
// 9. State (disabled:, focus:)

<div className="flex items-center gap-2 p-4 font-body text-foreground bg-card rounded-xl border border-border transition-colors hover:border-primary/30">
```

### Common Pitfalls to Avoid
- Don't hardcode hex colors - use semantic tokens
- Don't overuse the primary purple - reserve for CTAs
- Don't mix icon libraries - use Lucide React only
- Don't skip responsive breakpoints
- Don't forget loading/error states
- Don't use inline styles except for dynamic values

---

## Quick Reference

### Essential Classes
```css
/* Containers */
.mx-auto.w-full.max-w-[1400px].px-4.sm:px-6.lg:px-8

/* Text */
.text-foreground (primary)
.text-foreground/80 (secondary)
.text-foreground/60 (muted)
.font-heading.font-extrabold (headings)
.font-body (body text)

/* Buttons */
.rounded-full.bg-foreground.text-white.px-5.py-2.5.font-semibold (primary CTA)
.rounded-full.border.border-foreground.text-foreground (secondary)

/* Cards */
.rounded-2xl.border.border-border.bg-card.p-6.shadow-sm

/* Inputs */
.w-full.rounded-xl.border.border-border.bg-background.px-4.py-3

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
```

---

**Last Updated**: ar.io rebrand (light mode focus)

For questions or working examples, refer to the [ar.io public site](https://ar.io) and components in `src/components/`.
