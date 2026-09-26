const fs = require('fs');

const manifest = JSON.parse(fs.readFileSync('scripts/batch2_manifest.json', 'utf8'));
const raw = fs.readFileSync('src/major-spares.js', 'utf8');
const jsonText = raw.replace(/^export const majorSpareProducts = /, '').replace(/;\s*$/, '');
const products = JSON.parse(jsonText);

let updated = 0;
manifest.forEach(item => {
  if (fs.existsSync(item.target)) {
    const p = products.find(x => x.id === item.id);
    if (p) {
      const publicPath = item.target.replace(/^public/, '');
      if (p.image !== publicPath) {
        p.image = publicPath;
        updated++;
        console.log(`Synced ${item.id} -> ${publicPath}`);
      }
    }
  }
});

if (updated > 0) {
  const newContent = `export const majorSpareProducts = ${JSON.stringify(products, null, 2)};\n`;
  fs.writeFileSync('src/major-spares.js', newContent, 'utf8');
  console.log(`\nUpdated ${updated} products in major-spares.js.`);
} else {
  console.log('\nNo new images found to sync yet.');
}
