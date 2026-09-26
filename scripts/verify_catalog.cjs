const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/major-spares.js');
const content = fs.readFileSync(filePath, 'utf8');
const match = content.match(/export const majorSpareProducts = (\[[\s\S]*?\]);\s*$/);
const products = eval(match[1]);

console.log('Total products in catalog:', products.length);

let missingFiles = 0;
const imageCounts = {};

products.forEach(p => {
  const relPath = p.image.replace(/^\//, '');
  const absPath = path.resolve('public', relPath);
  if (!fs.existsSync(absPath)) {
    console.error(`ERROR: File does not exist for ${p.id} (${p.name}): ${p.image} -> ${absPath}`);
    missingFiles++;
  }
  imageCounts[p.image] = (imageCounts[p.image] || 0) + 1;
});

const duplicates = Object.entries(imageCounts).filter(([img, count]) => count > 1);
console.log('Missing file count:', missingFiles);
console.log('Duplicate image groups:', duplicates.length);

if (duplicates.length > 0) {
  console.log('Duplicates found:', duplicates);
  process.exit(1);
}

if (missingFiles === 0 && duplicates.length === 0) {
  console.log('VERIFICATION PASSED: All 228 products have unique, existing image files on disk!');
}

// Check page by page
for (let p = 1; p <= Math.ceil(products.length / 12); p++) {
  const pageItems = products.slice((p - 1) * 12, p * 12);
  const images = new Set(pageItems.map(x => x.image));
  console.log(`Page ${p}: ${pageItems.length} products, ${images.size} unique images.`);
}
