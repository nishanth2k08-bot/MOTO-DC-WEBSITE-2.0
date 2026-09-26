const fs = require('fs');

const raw = fs.readFileSync('src/major-spares.js', 'utf8');
const jsonText = raw.replace(/^export const majorSpareProducts = /, '').replace(/;\s*$/, '');
const products = JSON.parse(jsonText);

let updated = 0;
products.forEach(p => {
  if (p.image && p.image.endsWith('.svg')) {
    const jpgCandidate = p.image.replace(/\.svg$/, '.jpg');
    const localPath = 'public' + jpgCandidate;
    if (fs.existsSync(localPath)) {
      console.log(`Updated ${p.id} (${p.name}):\n  ${p.image} -> ${jpgCandidate}`);
      p.image = jpgCandidate;
      updated++;
    }
  }
});

console.log(`\nTotal products updated: ${updated}`);
const newContent = `export const majorSpareProducts = ${JSON.stringify(products, null, 2)};\n`;
fs.writeFileSync('src/major-spares.js', newContent, 'utf8');
