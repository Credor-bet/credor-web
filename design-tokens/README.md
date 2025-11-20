# Design Tokens

This directory contains design tokens extracted from your Figma designs.

## 🚀 Quick Start

### ✅ Recommended: Use Cleaned/Semantic Tokens

1. **Extract tokens from Figma:**
   ```bash
   npm run figma:tokens
   ```

2. **Use the cleaned tokens (already created for you!):**
   - 📄 `cleaned-tokens.json` - Semantic, cleaned tokens (no duplicates)
   - 🎨 `cleaned-css-variables.css` - Clean CSS variables
   - ⚙️ `cleaned-tailwind-config.json` - Clean Tailwind config
   - 📖 `CLEANED_TOKENS_README.md` - Complete documentation

3. **Merge cleaned tokens into your project:**
   ```bash
   npm run figma:merge-cleaned
   ```

   This will:
   - ✅ Create backups of your config files
   - ✅ Update `tailwind.config.js` with semantic tokens
   - ✅ Update `src/app/globals.css` with CSS variables
   - ✅ Add only the useful, cleaned tokens

### 📦 Alternative: Use Raw Extracted Tokens

1. **Extract tokens from Figma:**
   ```bash
   npm run figma:tokens
   ```

2. **Review the generated files:**
   - `tokens.json` - Raw extracted tokens (10,771 lines)
   - `css-variables.css` - CSS variables for `globals.css`
   - `tailwind-config.json` - Tailwind config updates
   - `tokens.d.ts` - TypeScript type definitions

3. **Merge into your project:**
   ```bash
   npm run figma:merge
   ```

### 🎨 Export Assets

**Export icons, images, and logos from Figma:**
```bash
npm run figma:assets
```

## 📁 File Structure

```
design-tokens/
├── cleaned-tokens.json              # ✅ Recommended: Semantic cleaned tokens
├── cleaned-css-variables.css        # ✅ Recommended: Clean CSS variables
├── cleaned-tailwind-config.json     # ✅ Recommended: Clean Tailwind config
├── CLEANED_TOKENS_README.md         # ✅ Recommended: Clean tokens documentation
│
├── tokens.json                      # Raw extracted tokens (10,771 lines)
├── css-variables.css                # Raw CSS variables
├── tailwind-config.json             # Raw Tailwind config
├── tokens.d.ts                      # TypeScript type definitions
├── README.md                        # Auto-generated raw tokens documentation
│
└── assets/                          # Exported assets (icons, images, logos)
    ├── manifest.json
    └── *.svg, *.png
```

## 🎯 Why Use Cleaned Tokens?

**Before (Raw Extraction):**
- ❌ 10,771 lines
- ❌ 35+ duplicate dark green colors
- ❌ Many generic names (`frame-1171288069`, `ellipse-356`)
- ❌ Data strings (`$50.00`, dates, emails) as color names
- ❌ Hard to use in production

**After (Cleaned):**
- ✅ ~200 lines
- ✅ Unique semantic color names
- ✅ Meaningful tokens (`primary`, `success`, `error`)
- ✅ Ready to use in production
- ✅ Easy to understand and maintain

## 📝 Usage Examples

After merging cleaned tokens, use them like this:

### Colors
```tsx
<button className="bg-primary text-white">Login</button>
<div className="bg-success text-white">Success Message</div>
<span className="text-destructive">Error Text</span>
<Card className="bg-background border border-border">Card</Card>
```

### Typography
```tsx
<h1 className="text-xl font-semibold text-foreground">Heading</h1>
<p className="text-base text-foreground-muted">Body text</p>
<input className="text-lg placeholder:text-foreground-placeholder" />
```

### Border Radius
```tsx
<div className="rounded-lg bg-white">Card</div>
<button className="rounded-full bg-primary">Pill Button</button>
```

## 🔄 Updating Tokens

When your Figma designs change:

1. Run extraction: `npm run figma:tokens`
2. Review cleaned tokens in `cleaned-tokens.json`
3. Manually update cleaned tokens if needed
4. Merge again: `npm run figma:merge-cleaned`

## 📚 More Information

- See `CLEANED_TOKENS_README.md` for complete token documentation
- See `scripts/README.md` for extraction script documentation
