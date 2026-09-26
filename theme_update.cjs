const fs = require('fs');
const path = require('path');

const tabsDir = path.join(__dirname, 'src/components/tabs');
const headerPath = path.join(__dirname, 'src/components/Header.tsx');

const replacements = [
  [/bg-slate-900/g, 'bg-white'],
  [/bg-slate-950(?:\/(\d+))?/g, 'bg-slate-50'],
  [/border-slate-800/g, 'border-slate-200'],
  [/border-slate-700/g, 'border-slate-300'],
  [/text-white/g, 'text-slate-900'],
  [/text-slate-200/g, 'text-slate-800'],
  [/text-slate-300/g, 'text-slate-700'],
  [/text-slate-400/g, 'text-slate-500'],
  [/text-slate-500/g, 'text-slate-400'],
  [/bg-slate-800/g, 'bg-slate-100'],
  [/bg-slate-700/g, 'bg-slate-200'],
  [/divide-slate-800(?:\/\d+)?/g, 'divide-slate-200'],
  [/hover:bg-slate-800(?:\/\d+)?/g, 'hover:bg-slate-100'],
  [/hover:bg-slate-700/g, 'hover:bg-slate-200'],
  [/hover:border-slate-700/g, 'hover:border-slate-300'],
  [/ring-sky-500/g, 'ring-zamiigo-teal'],
  [/text-sky-400/g, 'text-zamiigo-teal'],
  [/text-sky-500/g, 'text-zamiigo-teal'],
  [/bg-sky-950/g, 'bg-zamiigo-ice'],
  [/bg-sky-500/g, 'bg-zamiigo-teal'],
  [/bg-sky-600/g, 'bg-zamiigo-teal'],
  [/hover:bg-sky-500/g, 'hover:bg-zamiigo-teal-dark'],
  [/text-amber-300/g, 'text-amber-700'],
  [/bg-amber-950/g, 'bg-amber-50'],
  [/border-amber-800/g, 'border-amber-200'],
  [/text-indigo-300/g, 'text-indigo-700'],
  [/bg-indigo-950/g, 'bg-indigo-50'],
  [/border-indigo-800/g, 'border-indigo-200'],
  [/text-purple-300/g, 'text-purple-700'],
  [/bg-purple-950/g, 'bg-purple-50'],
  [/border-purple-800/g, 'border-purple-200'],
  [/text-emerald-300/g, 'text-emerald-700'],
  [/text-emerald-400/g, 'text-emerald-600'],
  [/bg-emerald-950(?:\/\d+)?/g, 'bg-emerald-50'],
  [/border-emerald-800/g, 'border-emerald-200'],
  [/text-rose-300/g, 'text-rose-700'],
  [/text-rose-400/g, 'text-rose-600'],
  [/bg-rose-950(?:\/\d+)?/g, 'bg-rose-50'],
  [/border-rose-800/g, 'border-rose-200'],
  [/border-sky-500/g, 'border-zamiigo-teal'],
  [/border-sky-800/g, 'border-zamiigo-teal/20'],
  [/text-amber-400/g, 'text-amber-600'],
  [/text-amber-300/g, 'text-amber-600'],
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}

const componentsDir = path.join(__dirname, 'src/components');

function processDir(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

processDir(componentsDir);
