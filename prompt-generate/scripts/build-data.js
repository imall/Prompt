const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const LIBRARY_DIR = path.resolve(__dirname, '../../Prompt-Library');
const CONFIG_PATH = path.resolve(__dirname, '../config.json');
const OUTPUT_PATH = path.resolve(__dirname, '../data/data.json');

function scanMdFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('08_')) results.push(...scanMdFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const files = scanMdFiles(LIBRARY_DIR);
  const modules = {};

  for (const filePath of files) {
    const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
    if (!data.id || !data.category) continue;

    if (!modules[data.category]) modules[data.category] = [];
    modules[data.category].push({
      id: data.id,
      label: data.label ?? data.id,
      tags: data.tags ?? [],
      variants: data.variants ?? [],
      prompt: content.trim(),
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify({ categories: config.categories, modules }, null, 2),
    'utf8'
  );

  const total = Object.values(modules).reduce((a, b) => a + b.length, 0);
  console.log(`Built data.json: ${total} modules across ${Object.keys(modules).length} categories`);
}

main();
