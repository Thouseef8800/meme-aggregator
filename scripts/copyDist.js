const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

const projectRoot = path.resolve(__dirname, '..');
const srcDist = path.join(projectRoot, 'src', 'dist');
const rootDist = path.join(projectRoot, 'dist');

if (copyDir(srcDist, rootDist)) {
  console.log(`Copied ${srcDist} -> ${rootDist}`);
  process.exit(0);
} else {
  console.warn(`No ${srcDist} directory to copy`);
  process.exit(0);
}
