#!/usr/bin/env node

/**
 * Figma Assets Exporter
 * 
 * Exports icons, images, and other assets from Figma file.
 * 
 * Usage:
 *   node scripts/extract-figma-assets.js [node-ids]
 * 
 * If no node IDs provided, will attempt to find exportable nodes automatically.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const FIGMA_FILE_ID = process.env.FIGMA_FILE_ID || 'sRSHWjCAVu4gvILErghTe3';
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;

if (!FIGMA_ACCESS_TOKEN) {
  console.error('❌ Error: FIGMA_ACCESS_TOKEN environment variable is required');
  process.exit(1);
}

const API_BASE = 'https://api.figma.com/v1';
const ASSETS_DIR = path.join(__dirname, '..', 'design-tokens', 'assets');

// Ensure assets directory exists
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
 * Download file from URL
 */
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirects
        return downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

/**
 * Recursively find all nodes
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
 * Check if node is likely an icon or exportable asset
 */
function isExportableNode(node) {
  const exportableTypes = ['COMPONENT', 'INSTANCE', 'FRAME', 'GROUP', 'VECTOR'];
  const exportableNames = ['icon', 'logo', 'image', 'asset', 'svg', 'png'];
  
  if (!exportableTypes.includes(node.type)) {
    return false;
  }

  const nameLower = (node.name || '').toLowerCase();
  return exportableNames.some(keyword => nameLower.includes(keyword));
}

/**
 * Export assets from Figma
 */
async function exportAssets(nodeIds = []) {
  console.log('🚀 Starting Figma asset export...\n');
  console.log(`📁 File ID: ${FIGMA_FILE_ID}\n`);

  try {
    // Get file data
    console.log('📥 Fetching file data...');
    const fileData = await figmaRequest(`/files/${FIGMA_FILE_ID}`);
    
    let nodesToExport = [];
    
    if (nodeIds.length > 0) {
      // Export specific nodes
      nodesToExport = nodeIds.map(id => ({ id, name: id }));
      console.log(`📦 Exporting ${nodeIds.length} specified nodes...`);
    } else {
      // Find exportable nodes automatically
      console.log('🔍 Finding exportable nodes...');
      const allNodes = findAllNodes(fileData.document);
      nodesToExport = allNodes
        .filter(isExportableNode)
        .map(node => ({ id: node.id, name: node.name || 'unnamed' }));
      
      console.log(`📦 Found ${nodesToExport.length} exportable nodes`);
    }

    if (nodesToExport.length === 0) {
      console.log('⚠️  No nodes found to export');
      console.log('\n💡 Tip: Provide specific node IDs as arguments, or check your Figma file for components/icons');
      return;
    }

    // Export each node
    let exported = 0;
    const formats = ['SVG', 'PNG']; // You can add more: 'PDF', 'JPG', etc.

    for (const node of nodesToExport) {
      for (const format of formats) {
        try {
          console.log(`\n📤 Exporting ${node.name} as ${format}...`);
          
          const exportUrl = `/images/${FIGMA_FILE_ID}?ids=${node.id}&format=${format}&scale=1`;
          const exportData = await figmaRequest(exportUrl);
          
          if (exportData.images && exportData.images[node.id]) {
            const imageUrl = exportData.images[node.id];
            const filename = `${node.name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}.${format.toLowerCase()}`;
            const filepath = path.join(ASSETS_DIR, filename);
            
            await downloadFile(imageUrl, filepath);
            console.log(`✅ Saved: ${filename}`);
            exported++;
          }
        } catch (error) {
          console.error(`⚠️  Failed to export ${node.name} as ${format}: ${error.message}`);
        }
      }
    }

    console.log(`\n✨ Asset export complete!`);
    console.log(`📂 Assets saved to: ${ASSETS_DIR}`);
    console.log(`📊 Exported ${exported} files`);

    // Generate asset manifest
    const manifest = {
      exported: exported,
      timestamp: new Date().toISOString(),
      assets: fs.readdirSync(ASSETS_DIR)
        .filter(file => !file.startsWith('.'))
        .map(file => ({
          filename: file,
          path: `/design-tokens/assets/${file}`,
        })),
    };

    const manifestPath = path.join(ASSETS_DIR, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`💾 Asset manifest saved to: ${manifestPath}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Get node IDs from command line arguments
const nodeIds = process.argv.slice(2);

// Run export
exportAssets(nodeIds);

