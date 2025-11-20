#!/usr/bin/env node

/**
 * Merge Figma Tokens into Project
 * 
 * Helper script to merge extracted Figma tokens into your Tailwind config
 * and globals.css. This is a convenience script - you can also do it manually.
 * 
 * Usage:
 *   node scripts/merge-figma-tokens.js
 */

const fs = require('fs');
const path = require('path');

const TOKENS_DIR = path.join(__dirname, '..', 'design-tokens');
const TAILWIND_CONFIG_PATH = path.join(__dirname, '..', 'tailwind.config.js');
const GLOBALS_CSS_PATH = path.join(__dirname, '..', 'src', 'app', 'globals.css');

const TAILWIND_CONFIG_JSON = path.join(TOKENS_DIR, 'tailwind-config.json');
const CSS_VARIABLES = path.join(TOKENS_DIR, 'css-variables.css');

function mergeTokens() {
  console.log('🔄 Merging Figma tokens into project...\n');

  // Check if tokens exist
  if (!fs.existsSync(TAILWIND_CONFIG_JSON)) {
    console.error('❌ Error: No extracted tokens found.');
    console.error(`   Run: npm run figma:tokens`);
    process.exit(1);
  }

  // Read generated files
  const tailwindConfig = JSON.parse(fs.readFileSync(TAILWIND_CONFIG_JSON, 'utf8'));
  const cssVariables = fs.readFileSync(CSS_VARIABLES, 'utf8');

  console.log('✅ Found extracted tokens\n');

  // Show what will be merged
  const colorCount = Object.keys(tailwindConfig.theme.extend.colors || {}).length;
  const fontSizeCount = Object.keys(tailwindConfig.theme.extend.fontSize || {}).length;
  const spacingCount = Object.keys(tailwindConfig.theme.extend.spacing || {}).length;
  
  console.log('📊 Summary:');
  console.log(`   Colors: ${colorCount}`);
  console.log(`   Font Sizes: ${fontSizeCount}`);
  console.log(`   Spacing: ${spacingCount}`);
  console.log(`   Border Radius: ${Object.keys(tailwindConfig.theme.extend.borderRadius || {}).length}`);
  console.log(`   Shadows: ${Object.keys(tailwindConfig.theme.extend.boxShadow || {}).length}\n`);

  console.log('⚠️  This script will create backup files.');
  console.log('⚠️  Manual review is recommended after merging.\n');

  // Create backups
  const tailwindBackup = TAILWIND_CONFIG_PATH + '.backup';
  const cssBackup = GLOBALS_CSS_PATH + '.backup';

  if (fs.existsSync(TAILWIND_CONFIG_PATH)) {
    fs.copyFileSync(TAILWIND_CONFIG_PATH, tailwindBackup);
    console.log(`💾 Backed up: ${path.basename(TAILWIND_CONFIG_PATH)}`);
  }

  if (fs.existsSync(GLOBALS_CSS_PATH)) {
    fs.copyFileSync(GLOBALS_CSS_PATH, cssBackup);
    console.log(`💾 Backed up: ${path.basename(GLOBALS_CSS_PATH)}\n`);
  }

  // Update Tailwind config
  console.log('📝 Updating tailwind.config.js...');
  updateTailwindConfig(tailwindConfig);
  
  // Update globals.css
  console.log('📝 Updating globals.css...');
  updateGlobalsCSS(cssVariables);

  console.log('\n✨ Merge complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Review the changes in tailwind.config.js and globals.css');
  console.log('   2. Test your app: npm run dev');
  console.log('   3. If something breaks, restore from backup files (*.backup)');
  console.log('   4. Manually adjust tokens as needed\n');
}

function updateTailwindConfig(generatedConfig) {
  const currentConfig = fs.readFileSync(TAILWIND_CONFIG_PATH, 'utf8');
  
  // This is a simple merge - for complex merges, manual review is better
  let updatedConfig = currentConfig;

  // Extract extend section
  const extendMatch = currentConfig.match(/extend:\s*{([\s\S]*?)},/);
  
  if (extendMatch) {
    // Try to merge colors
    const colorsJSON = JSON.stringify(generatedConfig.theme.extend.colors, null, 2)
      .replace(/"([^"]+)":/g, '$1:')
      .replace(/"/g, "'");
    
    // Add a comment with Figma colors
    const figmaColorsComment = `\n        // Figma colors (merge manually):\n        // ${colorsJSON.split('\n').join('\n        // ')}\n`;
    
    // Find where to insert
    const insertAfter = extendMatch.index + extendMatch[0].length - 1;
    updatedConfig = updatedConfig.slice(0, insertAfter) + figmaColorsComment + updatedConfig.slice(insertAfter);
  }

  // Write merged config with instructions
  const instructions = `
/*
 * FIGMA TOKENS MERGE GUIDE
 * 
 * The extracted Figma tokens are in: design-tokens/tailwind-config.json
 * 
 * To merge colors, add to theme.extend.colors:
 * ${JSON.stringify(generatedConfig.theme.extend.colors, null, 2).split('\n').map(l => ' * ' + l).join('\n')}
 * 
 * To merge font sizes, add to theme.extend.fontSize:
 * ${JSON.stringify(generatedConfig.theme.extend.fontSize, null, 2).split('\n').map(l => ' * ' + l).join('\n')}
 * 
 * To merge spacing, add to theme.extend.spacing:
 * ${JSON.stringify(generatedConfig.theme.extend.spacing, null, 2).split('\n').map(l => ' * ' + l).join('\n')}
 * 
 * To merge border radius, add to theme.extend.borderRadius:
 * ${JSON.stringify(generatedConfig.theme.extend.borderRadius, null, 2).split('\n').map(l => ' * ' + l).join('\n')}
 * 
 * To merge shadows, add to theme.extend.boxShadow:
 * ${JSON.stringify(generatedConfig.theme.extend.boxShadow, null, 2).split('\n').map(l => ' * ' + l).join('\n')}
 */
`;

  // Prepend instructions
  const configWithInstructions = currentConfig + '\n' + instructions;
  fs.writeFileSync(TAILWIND_CONFIG_PATH, configWithInstructions);
  
  console.log('   ✅ Updated (with merge instructions in comments)');
}

function updateGlobalsCSS(cssVariables) {
  const currentCSS = fs.readFileSync(GLOBALS_CSS_PATH, 'utf8');
  
  // Extract :root section from generated CSS
  const rootMatch = cssVariables.match(/:root\s*{([\s\S]*?)}/);
  
  if (rootMatch) {
    const figmaVars = rootMatch[1].trim();
    
    // Find existing :root block
    const currentRootMatch = currentCSS.match(/(:root\s*{[\s\S]*?})/);
    
    if (currentRootMatch) {
      // Append Figma variables with comment
      const updatedRoot = currentRootMatch[0] + 
        '\n\n  /* Figma design tokens */\n' +
        figmaVars.split('\n').map(line => '  ' + line).join('\n');
      
      const updatedCSS = currentCSS.replace(currentRootMatch[0], updatedRoot);
      fs.writeFileSync(GLOBALS_CSS_PATH, updatedCSS);
      console.log('   ✅ Updated (Figma CSS variables added)');
    } else {
      // No :root found, append it
      const updatedCSS = currentCSS + '\n\n' + cssVariables;
      fs.writeFileSync(GLOBALS_CSS_PATH, updatedCSS);
      console.log('   ✅ Updated (added :root block)');
    }
  } else {
    console.log('   ⚠️  No CSS variables found in generated file');
  }
}

// Run merge
mergeTokens();

