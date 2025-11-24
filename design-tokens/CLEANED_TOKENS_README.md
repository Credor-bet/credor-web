# Cleaned Design Tokens

This file contains **semantic, cleaned design tokens** extracted from your Figma designs. All duplicates have been removed and colors have been mapped to meaningful names.

## 🎨 Colors

### Brand Colors
- **`primary`** - `hsl(135, 63%, 28%)` - Main brand green (#1A7431)
- **`primary-dark`** - `hsl(135, 62%, 17%)` - Darker brand green (#10451D)

### Status Colors
- **`success`** - `hsl(135, 70%, 52%)` - Success green (#31DA5C)
- **`destructive`** - `hsl(358, 85%, 52%)` - Error red (#ED1C24)
- **`danger`** - `hsl(359, 70%, 52%)` - Danger red (#DA3134)
- **`warning`** - `hsl(43, 86%, 46%)` - Warning yellow (#DBA111)

### Background Colors
- **`background`** - `hsl(210, 67%, 99%)` - Light blue background (#FAFCFE)
- **`background-light`** - `hsl(210, 14%, 97%)` - Light gray background (#F7F8F9)
- **`background-gray`** - `hsl(0, 0%, 92%)` - Gray background (#EBEBEB)

### Text Colors
- **`foreground`** - `hsl(219, 19%, 15%)` - Primary text (#1E232C)
- **`foreground-muted`** - `hsl(216, 18%, 34%)` - Secondary text (#475467)
- **`foreground-placeholder`** - `hsl(212, 14%, 57%)` - Placeholder text (#8391A1)

### Border Colors
- **`border`** - `hsl(218, 17%, 91%)` - Default border (#E4E7EC)
- **`border-gray`** - `hsl(217, 10%, 84%)` - Gray border (#D2D5DA)

### Base Colors
- **`white`** - `hsl(0, 0%, 100%)` - Pure white (#FFFFFF)
- **`black`** - `hsl(0, 0%, 0%)` - Pure black (#000000)

### Accent Colors
- **`accent-yellow`** - `hsl(78, 26%, 75%)` - Accent yellow/green (#C7D1B0)
- **`accent-blue`** - `hsl(212, 96%, 30%)` - Accent blue (#034694)

## 📝 Typography

### Font Families
- **`font-sans`** - DM Sans (primary font)
- **`font-display`** - Rushon Ground (display/logo font)

### Font Sizes
- **`text-xs`** - 11px (very small text)
- **`text-sm`** - 12px (small text, captions)
- **`text-base`** - 14px (body text, default)
- **`text-md`** - 15px (medium text, form labels)
- **`text-lg`** - 16px (large body text, inputs)
- **`text-xl`** - 20px (headings, titles)
- **`text-2xl`** - 30px (large headings)
- **`text-display`** - 224px (logo only)

### Font Weights
- **`font-regular`** - 400 (body text)
- **`font-medium`** - 500 (medium emphasis)
- **`font-semibold`** - 600 (headings)
- **`font-bold`** - 700 (strong emphasis)

## 📐 Border Radius

- **`rounded-sm`** - 4px
- **`rounded-md`** - 6px
- **`rounded`** - 8px (default)
- **`rounded-lg`** - 12px
- **`rounded-xl`** - 16px
- **`rounded-2xl`** - 18px
- **`rounded-3xl`** - 22px
- **`rounded-4xl`** - 24px
- **`rounded-full`** - 100px (pill shape)
- **`rounded-logo`** - 40px (logo)

## 📏 Spacing

- **`xs`** - 4px
- **`sm`** - 8px
- **`md`** - 12px
- **`lg`** - 16px
- **`xl`** - 24px
- **`2xl`** - 30px
- **`3xl`** - 36px

## 🚀 Usage in Tailwind

### Colors
```tsx
<div className="bg-primary text-white">Primary Button</div>
<div className="bg-success text-white">Success Message</div>
<div className="text-destructive">Error Text</div>
<div className="bg-background border border-border">Card</div>
```

### Typography
```tsx
<h1 className="text-xl font-semibold text-foreground">Heading</h1>
<p className="text-base text-foreground-muted">Body text</p>
<input className="text-lg text-foreground placeholder:text-foreground-placeholder" />
```

### Border Radius
```tsx
<div className="rounded-lg bg-white">Card</div>
<button className="rounded-full bg-primary">Pill Button</button>
```

## 🔄 Integration

1. **Copy CSS variables** from `cleaned-css-variables.css` to `src/app/globals.css`
2. **Merge Tailwind config** from `cleaned-tailwind-config.json` into `tailwind.config.js`
3. **Use semantic tokens** throughout your app!

## 📊 Comparison

**Before (Raw Extraction):**
- 10,771 lines
- 35+ duplicate dark green colors
- Many generic names (`frame-1171288069`, `ellipse-356`)

**After (Cleaned):**
- ~200 lines
- Unique semantic color names
- Ready to use in production

