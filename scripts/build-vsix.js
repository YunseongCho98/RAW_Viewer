/**
 * Build .vsix for Marketplace upload (Node 18+, no vsce).
 * VS Code Marketplace expects OPC zip with [Content_Types].xml + extension/ (package.json as manifest).
 * No extension.vsixmanifest - that is for Visual Studio, not VS Code.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));

const version = pkg.version;

const contentTypesXml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".md" ContentType="text/markdown"/>
  <Default Extension=".map" ContentType="application/octet-stream"/>
</Types>`;

function main() {
  const outDir = path.join(root, 'vsix-build');
  const extDir = path.join(outDir, 'extension');

  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
  fs.mkdirSync(extDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, '[Content_Types].xml'), contentTypesXml, 'utf8');

  fs.copyFileSync(path.join(root, 'package.json'), path.join(extDir, 'package.json'));
  fs.copyFileSync(path.join(root, 'README.md'), path.join(extDir, 'README.md'));
  copyDir(path.join(root, 'out'), path.join(extDir, 'out'));

  const vsixName = `${pkg.name}-${version}.vsix`;
  const vsixPath = path.join(root, vsixName);

  if (fs.existsSync(vsixPath)) fs.unlinkSync(vsixPath);

  execSync(`cd "${outDir}" && zip -r "${vsixPath}" "[Content_Types].xml" extension`, {
    stdio: 'inherit',
    shell: true
  });

  fs.rmSync(outDir, { recursive: true });
  console.log('Created:', vsixPath);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

main();
