#!/usr/bin/env node

/**
 * Merge Cleaned Figma Tokens into Project
 * 
 * Merges cleaned/semantic design tokens into your Tailwind config and globals.css.
 * This is the recommended approach - uses only semantic tokens.
 * 
 * Usage:
 *   node scripts/merge-cleaned-tokens.js
 */

const fs = require('fs');
const path = require('path');

const TOKENS_DIR = path.join(__dirname, '..', 'design-tokens');
const TAILWIND_CONFIG_PATH = path.join(__dirname, '..', 'tailwind.config.js');
const GLOBALS_CSS_PATH = path.join(__dirname, '..', 'src', 'app', 'globals.css');

const CLEANED_CSS_VARIABLES = path.join(TOKENS_DIR, 'cleaned-css-variables.css');
const CLEANED_TAILWIND_CONFIG = path.join(TOKENS_DIR, 'cleaned-tailwind-config.json');

function mergeCleanedTokens() {
  console.log('🔄 Merging cleaned Figma tokens into project...\n');

  // Check if cleaned tokens exist
  if (!fs.existsSync(CLEANED_CSS_VARIABLES)) {
    console.error('❌ Error: No cleaned tokens found.');
    console.error(`   Run the extraction first: npm run figma:tokens`);
    console.error(`   Then review and clean the tokens.`);
    process.exit(1);
  }

  // Read files
  const cssVariables = fs.readFileSync(CLEANED_CSS_VARIABLES, 'utf8');
  const tailwindConfig = JSON.parse(fs.readFileSync(CLEANED_TAILWIND_CONFIG, 'utf8'));
  const currentTailwind = fs.readFileSync(TAILWIND_CONFIG_PATH, 'utf8');
  const currentCSS = fs.readFileSync(GLOBALS_CSS_PATH, 'utf8');

  console.log('✅ Found cleaned tokens\n');

  // Create backups
  const tailwindBackup = TAILWIND_CONFIG_PATH + '.backup';
  const cssBackup = GLOBALS_CSS_PATH + '.backup';

  fs.copyFileSync(TAILWIND_CONFIG_PATH, tailwindBackup);
  fs.copyFileSync(GLOBALS_CSS_PATH, cssBackup);
  console.log('💾 Created backups:\n');
  console.log(`   ${path.basename(TAILWIND_CONFIG_PATH)}.backup`);
  console.log(`   ${path.basename(GLOBALS_CSS_PATH)}.backup\n`);

  // Update globals.css
  console.log('📝 Updating globals.css...');
  updateGlobalsCSS(cssVariables, currentCSS);
  
  // Update tailwind.config.js
  console.log('📝 Updating tailwind.config.js...');
  updateTailwindConfig(tailwindConfig, currentTailwind);

  console.log('\n✨ Merge complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Review the changes in tailwind.config.js and globals.css');
  console.log('   2. Test your app: npm run dev');
  console.log('   3. If something breaks, restore from backup files (*.backup)');
  console.log('   4. Start using semantic tokens: bg-primary, text-foreground, etc.\n');
}

function updateGlobalsCSS(cssVariables, currentCSS) {
  // Extract :root section from cleaned CSS
  const rootMatch = cssVariables.match(/(:root\s*{[\s\S]*?})/);
  
  if (rootMatch && rootMatch[1]) {
    const figmaVars = rootMatch[1].trim();
    
    // Find existing :root block
    const currentRootMatch = currentCSS.match(/(:root\s*{[\s\S]*?})/);
    
    if (currentRootMatch) {
      // Check if Figma tokens already exist (check for Figma-specific tokens)
      if (currentCSS.includes('--primary-dark:') || currentCSS.includes('--success:') || currentCSS.includes('--background-light:')) {
        console.log('   ⚠️  Figma tokens already found in globals.css');
        console.log('   ⚠️  Skipping CSS variables update (already merged?)');
        console.log('   💡 If you want to replace, manually update globals.css\n');
        return;
      }

      // Extract just the variable declarations (without :root { and })
      const varsContent = figmaVars
        .replace(/:root\s*{/, '')
        .replace(/}\s*$/, '')
        .trim();
      
      // Append Figma variables with comment
      const updatedRoot = currentRootMatch[0] + 
        '\n\n  /* Figma Design Tokens - Cleaned/Semantic */\n' +
        varsContent.split('\n').map(line => '  ' + line.trim()).join('\n');
      
      const updatedCSS = currentCSS.replace(currentRootMatch[0], updatedRoot);
      fs.writeFileSync(GLOBALS_CSS_PATH, updatedCSS);
      console.log('   ✅ Updated (Figma CSS variables added)\n');
    } else {
      // No :root found, prepend it before @tailwind
      const updatedCSS = cssVariables + '\n\n' + currentCSS;
      fs.writeFileSync(GLOBALS_CSS_PATH, updatedCSS);
      console.log('   ✅ Updated (added :root block)\n');
    }
  } else {
    console.log('   ⚠️  No CSS variables found in cleaned file\n');
  }
}

function updateTailwindConfig(tailwindConfig, currentTailwind) {
  // Parse current config (simple approach - just append)
  const currentConfigMatch = currentTailwind.match(/(module\.exports\s*=\s*{[\s\S]*?theme:\s*{[\s\S]*?extend:\s*{)/);
  
  if (currentConfigMatch) {
    // Check if Figma tokens already exist
    if (currentTailwind.includes('"primary":')) {
      console.log('   ⚠️  Figma tokens already found in tailwind.config.js');
      console.log('   ⚠️  Skipping Tailwind config update (already merged?)');
      console.log('   💡 If you want to replace, manually update tailwind.config.js\n');
      return;
    }

    // Create a formatted config string to merge
    const extendSection = JSON.stringify(tailwindConfig.theme.extend, null, 2)
      .replace(/"(\w+)":/g, '$1:')
      .replace(/"/g, "'")
      .split('\n')
      .map((line, idx) => idx === 0 ? line : '        ' + line)
      .join('\n');

    // Find where to insert (after extend: {)
    const insertAfter = currentConfigMatch.index + currentConfigMatch[0].length;
    
    // Insert cleaned config
    const beforeExtend = currentTailwind.slice(0, insertAfter);
    const afterExtend = currentTailwind.slice(insertAfter);
    
    // Remove closing brace from extendSection and merge
    const extendWithoutBrace = extendSection.slice(0, -1); // Remove last }
    const merged = beforeExtend + '\n' + extendWithoutBrace.split('\n').slice(1).map(l => '      ' + l).join('\n') + '\n      },\n' + afterExtend;
    
    fs.writeFileSync(TAILWIND_CONFIG_PATH, merged);
    console.log('   ✅ Updated (merged cleaned Tailwind config)\n');
  } else {
    // Fallback: append instructions
    const instructions = `
/*
 * FIGMA TOKENS - CLEANED/SEMANTIC
 * 
 * To merge cleaned tokens, add to theme.extend:
 * ${JSON.stringify(tailwindConfig.theme.extend, null, 2).split('\n').map(l => ' * ' + l).join('\n')}
 */
`;

    const updatedConfig = currentTailwind + '\n' + instructions;
    fs.writeFileSync(TAILWIND_CONFIG_PATH, updatedConfig);
    console.log('   ✅ Updated (with merge instructions in comments)\n');
  }
}

// Run merge
mergeCleanedTokens();

