const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/major-spares.js');
const content = fs.readFileSync(filePath, 'utf8');
const diskFiles = fs.readdirSync(path.resolve('public/images/products'));

let updatedCount = 0;
const newContent = content.replace(/\{\s*"id":\s*"(sp-\d+)"[\s\S]*?\}/g, (block, id) => {
  const matches = diskFiles.filter(f => f.startsWith(id + '_'));
  if (!matches.length) return block;
  const nonOem = matches.find(f => !f.endsWith('_oem.jpg')) || matches[0];
  const newImagePath = '/images/products/' + nonOem;
  
  const updatedBlock = block.replace(/"image":\s*"[^"]+"/, `"image": "${newImagePath}"`);
  if (updatedBlock !== block) updatedCount++;
  return updatedBlock;
});

console.log(`Updated ${updatedCount} products in src/major-spares.js`);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully saved src/major-spares.js');
