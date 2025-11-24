# Figma Design Token Extraction Scripts

This directory contains scripts to extract design tokens and assets from your Figma designs.

## Setup

1. **Get your Figma Personal Access Token:**
   - Go to Figma → Settings → Account
   - Scroll to "Personal access tokens"
   - Click "Create new token"
   - Copy the token

2. **Set environment variables:**

   Create or update `.env.local` in the project root:
   ```env
   FIGMA_ACCESS_TOKEN=your_figma_token_here
   FIGMA_FILE_ID=sRSHWjCAVu4gvILErghTe3
   ```

   Or export them in your terminal:
   ```powershell
   # PowerShell
   $env:FIGMA_ACCESS_TOKEN="your_token_here"
   $env:FIGMA_FILE_ID="sRSHWjCAVu4gvILErghTe3"
   ```

   ```bash
   # Bash
   export FIGMA_ACCESS_TOKEN="your_token_here"
   export FIGMA_FILE_ID="sRSHWjCAVu4gvILErghTe3"
   ```

## Usage

### Extract Design Tokens

Extract colors, typography, spacing, shadows, and other design tokens:

```bash
npm run figma:tokens
```

Or directly:
```bash
node scripts/extract-figma-tokens.js
```

This will:
- ✅ Extract all colors from your Figma file
- ✅ Extract typography styles (fonts, sizes, weights)
- ✅ Extract spacing values
- ✅ Extract border radius values
- ✅ Extract shadow effects
- ✅ Generate CSS variables (`design-tokens/css-variables.css`)
- ✅ Generate Tailwind config updates (`design-tokens/tailwind-config.json`)
- ✅ Generate TypeScript types (`design-tokens/tokens.d.ts`)
- ✅ Generate documentation (`design-tokens/README.md`)

**Output:** All files are saved to `design-tokens/` directory.

### Merge Tokens into Project

After extracting tokens, merge them into your Tailwind config and CSS:

```bash
npm run figma:merge
```

This will:
- ✅ Create backups of your current config files
- ✅ Update `tailwind.config.js` with merge instructions
- ✅ Update `src/app/globals.css` with CSS variables
- ⚠️ Manual review recommended after merging

### Export Assets

Export icons, images, and logos from Figma:

```bash
npm run figma:assets
```

Or with specific node IDs:
```bash
node scripts/extract-figma-assets.js [node-id-1] [node-id-2]
```

This will:
- ✅ Find all exportable nodes (icons, logos, images)
- ✅ Export as SVG and PNG formats
- ✅ Save to `design-tokens/assets/`
- ✅ Generate asset manifest

**To find node IDs:**
1. Open your Figma file
2. Right-click on the element you want to export
3. Copy the link → The node ID is in the URL (after `node-id=`)
4. Example: `https://figma.com/file/xxx?node-id=123-456` → Node ID is `123-456` (keep the hyphen format)

## Output Structure

```
design-tokens/
├── tokens.json              # Raw extracted tokens (JSON)
├── css-variables.css        # CSS variables for globals.css
├── tailwind-config.json     # Tailwind config to merge
├── tokens.d.ts             # TypeScript type definitions
├── README.md               # Generated documentation
└── assets/
    ├── manifest.json       # Asset export manifest
    ├── icon-name.svg       # Exported SVGs
    └── logo-name.png       # Exported PNGs
```

## Next Steps

After running the extraction:

1. **Review the generated files** in `design-tokens/`
2. **Update `tailwind.config.js`** with values from `tailwind-config.json`
3. **Update `src/app/globals.css`** with CSS variables from `css-variables.css`
4. **Copy assets** from `design-tokens/assets/` to `public/` if needed
5. **Import types** in your TypeScript files: `import { designTokens } from '@/design-tokens/tokens'`

## Troubleshooting

### "FIGMA_ACCESS_TOKEN environment variable is required"
- Make sure you've set the environment variable in `.env.local` or exported it in your terminal
- For PowerShell: `$env:FIGMA_ACCESS_TOKEN="your_token"`
- For Bash: `export FIGMA_ACCESS_TOKEN="your_token"`

### "API Error 403"
- Your token might not have access to the file
- Make sure you're the owner or have edit access to the Figma file
- Try creating a new token

### "API Error 404"
- Check that the `FIGMA_FILE_ID` is correct
- The file ID is in the Figma URL: `figma.com/file/FILE_ID/...`

### No colors/typography extracted
- Make sure your Figma file has named styles or properly named layers
- Colors should be in fills, typography should be in text layers
- Try manually inspecting elements in Figma to see if they have styles applied

## Manual Integration

If the automatic extraction doesn't capture everything:

1. Open your Figma file
2. Select an element → Inspect panel (right sidebar)
3. Copy the CSS values (colors, spacing, etc.)
4. Manually add to `tailwind.config.js` or `globals.css`

## Updating Tokens

When your designs change in Figma:
1. Just run the scripts again: `npm run figma:tokens`
2. Review the changes in `design-tokens/`
3. Update your config files accordingly

