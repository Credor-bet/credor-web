#!/usr/bin/env node

/**
 * Figma Design Tokens Extractor
 * 
 * Extracts design tokens (colors, typography, spacing, etc.) from Figma
 * and generates Tailwind config updates and CSS variables.
 * 
 * Usage:
 *   node scripts/extract-figma-tokens.js
 * 
 * Requires:
 *   - FIGMA_ACCESS_TOKEN environment variable
 *   - FIGMA_FILE_ID environment variable (or default from URL)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const FIGMA_FILE_ID = process.env.FIGMA_FILE_ID || 'sRSHWjCAVu4gvILErghTe3';
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;

if (!FIGMA_ACCESS_TOKEN) {
  console.error('❌ Error: FIGMA_ACCESS_TOKEN environment variable is required');
  console.error('   Set it in your .env.local file or export it:');
  console.error('   export FIGMA_ACCESS_TOKEN=your_token_here');
  process.exit(1);
}

const API_BASE = 'https://api.figma.com/v1';

// Output directories
const OUTPUT_DIR = path.join(__dirname, '..', 'design-tokens');
const ASSETS_DIR = path.join(OUTPUT_DIR, 'assets');

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

/**
 * Make HTTP request to Figma API
 */
function figmaRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${endpoint}`;
    const options = {
      headers: {
        'X-Figma-Token': FIGMA_ACCESS_TOKEN,
      },
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Recursively find all nodes in the file
 */
function findAllNodes(node, nodes = []) {
  if (node) {
    nodes.push(node);
    if (node.children) {
      node.children.forEach((child) => findAllNodes(child, nodes));
    }
  }
  return nodes;
}

/**
 * Extract color from Figma color object
 */
function extractColor(figmaColor) {
  if (!figmaColor) return null;
  
  // Figma colors are in 0-1 range
  const r = Math.round(figmaColor.r * 255);
  const g = Math.round(figmaColor.g * 255);
  const b = Math.round(figmaColor.b * 255);
  const a = figmaColor.a !== undefined ? figmaColor.a : 1;

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(rgb) {
  const match = rgb.match(/\d+/g);
  if (!match) return null;
  
  let r = parseInt(match[0]) / 255;
  let g = parseInt(match[1]) / 255;
  let b = parseInt(match[2]) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return { h, s, l };
}

/**
 * Extract design tokens from Figma file
 */
async function extractTokens() {
  console.log('🚀 Starting Figma token extraction...\n');
  console.log(`📁 File ID: ${FIGMA_FILE_ID}\n`);

  try {
    // Get file metadata
    console.log('📥 Fetching file data...');
    const fileData = await figmaRequest(`/files/${FIGMA_FILE_ID}`);
    
    // Get styles (design tokens)
    console.log('📥 Fetching styles...');
    const styles = await figmaRequest(`/files/${FIGMA_FILE_ID}/styles`);

    const tokens = {
      colors: {},
      typography: {},
      spacing: {},
      shadows: {},
      borderRadius: {},
      effects: {},
    };

    // Extract colors from styles
    if (styles.meta && styles.meta.styles) {
      console.log('\n🎨 Extracting colors...');
      const colorStyles = styles.meta.styles.filter(s => s.styleType === 'FILL');
      
      colorStyles.forEach((style) => {
        const key = style.name.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        
        // We'll need to fetch the actual style value
        // For now, we'll extract from document
        tokens.colors[key] = {
          name: style.name,
          description: style.description || '',
          figmaId: style.styleId,
        };
      });
    }

    // Extract from document nodes
    console.log('🔍 Analyzing document structure...');
    const allNodes = findAllNodes(fileData.document);
    
    // Extract colors from fills
    const colorMap = new Map();
    allNodes.forEach((node) => {
      if (node.fills && Array.isArray(node.fills)) {
        node.fills.forEach((fill) => {
          if (fill.type === 'SOLID' && fill.color) {
            const color = extractColor(fill.color);
            const key = node.name?.toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '') || 'color';
            
            if (color && !colorMap.has(key)) {
              colorMap.set(key, {
                rgb: color,
                hsl: rgbToHsl(color),
                opacity: fill.opacity || 1,
                nodeName: node.name,
              });
            }
          }
        });
      }

      // Extract typography
      if (node.type === 'TEXT' && node.style) {
        const fontKey = node.name?.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '') || 'text';
        
        if (!tokens.typography[fontKey]) {
          tokens.typography[fontKey] = {
            fontSize: node.style.fontSize,
            fontFamily: node.style.fontFamily,
            fontWeight: node.style.fontWeight,
            lineHeight: node.style.lineHeightPx,
            letterSpacing: node.style.letterSpacing,
            textDecoration: node.style.textDecoration,
          };
        }
      }

      // Extract spacing (from frames/containers)
      if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
        const spacing = {
          paddingLeft: node.paddingLeft,
          paddingRight: node.paddingRight,
          paddingTop: node.paddingTop,
          paddingBottom: node.paddingBottom,
        };
        
        const spacingKey = node.name?.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '') || 'spacing';
        
        if (!tokens.spacing[spacingKey]) {
          tokens.spacing[spacingKey] = spacing;
        }
      }

      // Extract border radius
      if (node.cornerRadius) {
        const radiusKey = node.name?.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '') || 'radius';
        
        if (!tokens.borderRadius[radiusKey]) {
          tokens.borderRadius[radiusKey] = node.cornerRadius;
        }
      }

      // Extract effects (shadows)
      if (node.effects && Array.isArray(node.effects)) {
        node.effects.forEach((effect) => {
          if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
            const shadowKey = node.name?.toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '') || 'shadow';
            
            if (!tokens.shadows[shadowKey]) {
              tokens.shadows[shadowKey] = {
                type: effect.type,
                color: extractColor(effect.color),
                offset: {
                  x: effect.offset?.x || 0,
                  y: effect.offset?.y || 0,
                },
                radius: effect.radius || 0,
                spread: effect.spread || 0,
              };
            }
          }
        });
      }
    });

    // Merge extracted colors
    colorMap.forEach((value, key) => {
      tokens.colors[key] = {
        ...tokens.colors[key],
        ...value,
      };
    });

    console.log(`✅ Extracted ${colorMap.size} colors`);
    console.log(`✅ Extracted ${Object.keys(tokens.typography).length} typography styles`);
    console.log(`✅ Extracted ${Object.keys(tokens.spacing).length} spacing values`);
    console.log(`✅ Extracted ${Object.keys(tokens.borderRadius).length} border radius values`);
    console.log(`✅ Extracted ${Object.keys(tokens.shadows).length} shadow effects\n`);

    // Save raw tokens
    const tokensPath = path.join(OUTPUT_DIR, 'tokens.json');
    fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
    console.log(`💾 Saved raw tokens to: ${tokensPath}`);

    // Generate CSS variables
    generateCSSVariables(tokens);
    
    // Generate Tailwind config
    generateTailwindConfig(tokens);

    // Generate TypeScript types
    generateTypeScriptTypes(tokens);

    // Generate documentation
    generateDocumentation(tokens, fileData);

    console.log('\n✨ Token extraction complete!');
    console.log(`📂 Output directory: ${OUTPUT_DIR}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Review generated files in design-tokens/');
    console.log('   2. Update tailwind.config.js with generated config');
    console.log('   3. Update src/app/globals.css with CSS variables');
    console.log('   4. Run: node scripts/extract-figma-assets.js (for icons/images)');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * Generate CSS variables for globals.css
 */
function generateCSSVariables(tokens) {
  console.log('\n🎨 Generating CSS variables...');

  let css = ':root {\n';
  
  // Colors
  Object.entries(tokens.colors).forEach(([key, value]) => {
    if (value.hsl) {
      css += `  --${key}: ${value.hsl.h} ${value.hsl.s}% ${value.hsl.l}%;\n`;
    } else if (value.rgb) {
      // Fallback to RGB if HSL not available
      const rgbMatch = value.rgb.match(/\d+/g);
      if (rgbMatch) {
        // Convert to HSL approximation
        css += `  --${key}: ${value.rgb};\n`;
      }
    }
  });

  // Border radius
  Object.entries(tokens.borderRadius).forEach(([key, value]) => {
    css += `  --radius-${key}: ${value}px;\n`;
  });

  css += '}\n\n.dark {\n  /* Dark mode overrides can go here */\n}\n';

  const cssPath = path.join(OUTPUT_DIR, 'css-variables.css');
  fs.writeFileSync(cssPath, css);
  console.log(`💾 Saved CSS variables to: ${cssPath}`);
}

/**
 * Generate Tailwind config updates
 */
function generateTailwindConfig(tokens) {
  console.log('⚙️  Generating Tailwind config...');

  let config = {
    theme: {
      extend: {
        colors: {},
        fontFamily: {},
        fontSize: {},
        spacing: {},
        borderRadius: {},
        boxShadow: {},
      },
    },
  };

  // Colors
  Object.entries(tokens.colors).forEach(([key, value]) => {
    if (value.hsl) {
      config.theme.extend.colors[key] = `hsl(var(--${key}))`;
    } else if (value.rgb) {
      config.theme.extend.colors[key] = value.rgb;
    }
  });

  // Typography
  const fontFamilies = new Set();
  const fontSizes = new Map();
  
  Object.entries(tokens.typography).forEach(([key, value]) => {
    if (value.fontFamily) {
      fontFamilies.add(value.fontFamily);
    }
    if (value.fontSize) {
      fontSizes.set(key, `${value.fontSize}px`);
    }
  });

  fontFamilies.forEach((font) => {
    config.theme.extend.fontFamily[font.toLowerCase().replace(/\s+/g, '-')] = [font];
  });

  fontSizes.forEach((size, key) => {
    config.theme.extend.fontSize[key] = size;
  });

  // Spacing
  Object.entries(tokens.spacing).forEach(([key, value]) => {
    if (value.paddingLeft) {
      config.theme.extend.spacing[`${key}-x`] = `${value.paddingLeft}px`;
    }
    if (value.paddingTop) {
      config.theme.extend.spacing[`${key}-y`] = `${value.paddingTop}px`;
    }
  });

  // Border radius
  Object.entries(tokens.borderRadius).forEach(([key, value]) => {
    config.theme.extend.borderRadius[key] = `${value}px`;
  });

  // Shadows
  Object.entries(tokens.shadows).forEach(([key, value]) => {
    const shadow = `${value.offset.x}px ${value.offset.y}px ${value.radius}px ${value.spread}px ${value.color}`;
    config.theme.extend.boxShadow[key] = shadow;
  });

  const configPath = path.join(OUTPUT_DIR, 'tailwind-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`💾 Saved Tailwind config to: ${configPath}`);
}

/**
 * Generate TypeScript types
 */
function generateTypeScriptTypes(tokens) {
  console.log('📘 Generating TypeScript types...');

  let types = `/**
 * Design Tokens - Generated from Figma
 * Auto-generated - Do not edit manually
 */

export interface DesignTokens {
  colors: {
${Object.keys(tokens.colors).map(key => `    '${key}': string;`).join('\n')}
  };
  typography: {
${Object.keys(tokens.typography).map(key => `    '${key}': TypographyStyle;`).join('\n')}
  };
  spacing: {
${Object.keys(tokens.spacing).map(key => `    '${key}': SpacingStyle;`).join('\n')}
  };
  borderRadius: {
${Object.keys(tokens.borderRadius).map(key => `    '${key}': number;`).join('\n')}
  };
  shadows: {
${Object.keys(tokens.shadows).map(key => `    '${key}': ShadowStyle;`).join('\n')}
  };
}

export interface TypographyStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: string;
}

export interface SpacingStyle {
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
}

export interface ShadowStyle {
  type: string;
  color: string;
  offset: { x: number; y: number };
  radius: number;
  spread: number;
}

export const designTokens: DesignTokens = ${JSON.stringify(tokens, null, 2)};
`;

  const typesPath = path.join(OUTPUT_DIR, 'tokens.d.ts');
  fs.writeFileSync(typesPath, types);
  console.log(`💾 Saved TypeScript types to: ${typesPath}`);
}

/**
 * Generate documentation
 */
function generateDocumentation(tokens, fileData) {
  console.log('📚 Generating documentation...');

  let doc = `# Design Tokens Documentation

Generated from Figma file: **${fileData.name}**  
File ID: \`${FIGMA_FILE_ID}\`  
Generated: ${new Date().toISOString()}

## Overview

This document describes all design tokens extracted from your Figma design file.

## Colors

${Object.entries(tokens.colors).map(([key, value]) => {
  const colorBox = value.hsl 
    ? `\`hsl(${value.hsl.h}, ${value.hsl.s}%, ${value.hsl.l}%)\``
    : `\`${value.rgb}\``;
  return `### \`${key}\`
- **Name**: ${value.name || 'N/A'}
- **Value**: ${colorBox}
- **Usage**: \`bg-${key}\` or \`text-${key}\` in Tailwind
`;
}).join('\n')}

## Typography

${Object.entries(tokens.typography).map(([key, value]) => {
  return `### \`${key}\`
- **Font Family**: ${value.fontFamily || 'N/A'}
- **Font Size**: ${value.fontSize || 'N/A'}px
- **Font Weight**: ${value.fontWeight || 'N/A'}
- **Line Height**: ${value.lineHeight || 'N/A'}px
`;
}).join('\n')}

## Spacing

${Object.entries(tokens.spacing).map(([key, value]) => {
  return `### \`${key}\`
- Padding: ${value.paddingTop || 0}px (top), ${value.paddingRight || 0}px (right), ${value.paddingBottom || 0}px (bottom), ${value.paddingLeft || 0}px (left)
`;
}).join('\n')}

## Border Radius

${Object.entries(tokens.borderRadius).map(([key, value]) => {
  return `- \`${key}\`: \`${value}px\` (use \`rounded-${key}\` in Tailwind)`;
}).join('\n')}

## Shadows

${Object.entries(tokens.shadows).map(([key, value]) => {
  return `### \`${key}\`
- Type: ${value.type}
- Offset: ${value.offset.x}px, ${value.offset.y}px
- Radius: ${value.radius}px
- Spread: ${value.spread}px
- Color: ${value.color}
`;
}).join('\n')}

## Usage

### In Tailwind CSS

\`\`\`tsx
<div className="bg-color-name text-typography-name rounded-radius-name shadow-shadow-name">
  Content
</div>
\`\`\`

### In CSS

\`\`\`css
.my-component {
  background-color: hsl(var(--color-name));
  border-radius: var(--radius-name);
}
\`\`\`

### In TypeScript

\`\`\`typescript
import { designTokens } from '@/design-tokens/tokens';

const primaryColor = designTokens.colors['primary-color'];
\`\`\`
`;

  const docPath = path.join(OUTPUT_DIR, 'README.md');
  fs.writeFileSync(docPath, doc);
  console.log(`💾 Saved documentation to: ${docPath}`);
}

// Run extraction
extractTokens();

