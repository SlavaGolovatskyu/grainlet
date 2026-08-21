#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'fs';
import { dirname, extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templateName = process.argv.includes('--ssr')
  || process.argv.some((argument) => argument === '--template=ssr')
  ? 'template-ssr'
  : 'template';
const templateDir = resolve(__dirname, `../${templateName}`);

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.json',
  '.html',
  '.css',
  '.md',
  '.svg',
  '.txt',
  '.map',
]);

function usage() {
  console.log(`Usage: create-grainlet <project-name>

Scaffold a Vite + Grainlet app.

  npx create-grainlet my-app
  npx create-grainlet my-app --ssr
  cd my-app
  npm install
  npm run dev
`);
}

function isValidName(name) {
  return /^[a-zA-Z0-9._-]+$/.test(name) && name !== '.' && name !== '..';
}

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function copyTemplate(src, dest, projectName) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const from = join(src, entry);
    const to = join(dest, entry);
    if (statSync(from).isDirectory()) {
      copyTemplate(from, to, projectName);
      continue;
    }
    if (!isTextFile(from)) {
      cpSync(from, to);
      continue;
    }
    let content = readFileSync(from, 'utf8');
    content = content.replaceAll('__PROJECT_NAME__', projectName);
    writeFileSync(to, content);
  }
}

const projectName = process.argv[2];

if (!projectName || projectName === '-h' || projectName === '--help') {
  usage();
  process.exit(projectName ? 0 : 1);
}

if (!isValidName(projectName)) {
  console.error(`Invalid project name: ${projectName}`);
  process.exit(1);
}

const target = resolve(process.cwd(), projectName);

if (existsSync(target) && readdirSync(target).length > 0) {
  console.error(`Directory already exists and is not empty: ${target}`);
  process.exit(1);
}

if (!existsSync(templateDir)) {
  console.error('Template directory missing. Reinstall create-grainlet.');
  process.exit(1);
}

copyTemplate(templateDir, target, projectName);

console.log(`
Created ${projectName}

  cd ${projectName}
  npm install
  npm run dev
`);
