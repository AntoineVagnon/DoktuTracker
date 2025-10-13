#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Processing translations from CSV to JSON...\n');

const CSV_PATH = path.join(__dirname, '..', 'translations-bosnian.csv');
const LOCALES_DIR = path.join(__dirname, '..', 'client', 'src', 'locales');

// Namespace mapping based on Section column
const NAMESPACE_MAP = {
  'Header': 'common',
  'Footer': 'common',
  'Landing': 'landing',
  'Auth': 'auth',
  'Dashboard': 'dashboard',
  'Doctors': 'doctors',
  'Booking': 'booking',
  'Error': 'errors',
  'Common': 'common'
};

// Helper function to generate translation key
function generateKey(section, page, context) {
  const parts = [
    section.toLowerCase().replace(/\s+/g, '_'),
    page.toLowerCase().replace(/\s+/g, '_'),
    context.toLowerCase().replace(/\s+/g, '_')
  ];
  return parts.filter(p => p).join('.');
}

// Helper function to set nested property
function setNestedProperty(obj, path, value) {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }

  current[keys[keys.length - 1]] = value;
}

async function processCSV() {
  const translations = {
    en: {},
    bs: {}
  };

  const fileStream = fs.createReadStream(CSV_PATH, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let isFirstLine = true;
  let lineCount = 0;

  for await (const line of rl) {
    // Skip header row
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }

    // Skip empty lines
    if (!line.trim()) continue;

    // Parse CSV line (handling commas within quotes)
    const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    if (!matches || matches.length < 5) continue;

    const [section, page, context, frenchOriginal, bosnianTranslation, notes] = matches.map(m =>
      m.replace(/^"(.*)"$/, '$1').trim()
    );

    // Generate key
    const key = generateKey(section, page, context);
    const namespace = NAMESPACE_MAP[section] || 'common';

    // Initialize namespace if not exists
    if (!translations.en[namespace]) translations.en[namespace] = {};
    if (!translations.bs[namespace]) translations.bs[namespace] = {};

    // Use French Original as English source (or Bosnian if French is missing)
    const englishText = frenchOriginal || bosnianTranslation;
    const bosnianText = bosnianTranslation || frenchOriginal;

    // Store translations
    setNestedProperty(translations.en[namespace], key, englishText);
    setNestedProperty(translations.bs[namespace], key, bosnianText);

    lineCount++;
  }

  console.log(`✅ Processed ${lineCount} translations`);
  return translations;
}

async function writeJSONFiles(translations) {
  // Create directories
  const enDir = path.join(LOCALES_DIR, 'en');
  const bsDir = path.join(LOCALES_DIR, 'bs');

  if (!fs.existsSync(enDir)) fs.mkdirSync(enDir, { recursive: true });
  if (!fs.existsSync(bsDir)) fs.mkdirSync(bsDir, { recursive: true });

  // Write namespace files
  const namespaces = Object.keys(translations.en);

  for (const namespace of namespaces) {
    const enContent = JSON.stringify(translations.en[namespace], null, 2);
    const bsContent = JSON.stringify(translations.bs[namespace], null, 2);

    const enPath = path.join(enDir, `${namespace}.json`);
    const bsPath = path.join(bsDir, `${namespace}.json`);

    fs.writeFileSync(enPath, enContent);
    fs.writeFileSync(bsPath, bsContent);

    const enKeys = Object.keys(flattenObject(translations.en[namespace])).length;
    const bsKeys = Object.keys(flattenObject(translations.bs[namespace])).length;

    console.log(`  📝 ${namespace}.json: ${enKeys} English, ${bsKeys} Bosnian translations`);
  }

  console.log(`\n✅ Generated ${namespaces.length} namespace files for 2 languages`);
}

function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const pre = prefix.length ? `${prefix}.` : '';
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(acc, flattenObject(obj[key], pre + key));
    } else {
      acc[pre + key] = obj[key];
    }
    return acc;
  }, {});
}

function validateTranslations(translations) {
  console.log('\n🔍 Validating translations...');

  let totalEn = 0;
  let totalBs = 0;
  let missingInBs = 0;

  for (const namespace in translations.en) {
    const enFlat = flattenObject(translations.en[namespace]);
    const bsFlat = flattenObject(translations.bs[namespace]);

    totalEn += Object.keys(enFlat).length;
    totalBs += Object.keys(bsFlat).length;

    for (const key in enFlat) {
      if (!bsFlat[key]) {
        missingInBs++;
      }
    }
  }

  console.log(`  English translations: ${totalEn}`);
  console.log(`  Bosnian translations: ${totalBs}`);

  if (missingInBs > 0) {
    console.log(`  ⚠️  Missing Bosnian translations: ${missingInBs}`);
  } else {
    console.log(`  ✅ All English texts have Bosnian translations`);
  }

  return { totalEn, totalBs, missingInBs };
}

async function main() {
  try {
    const translations = await processCSV();
    await writeJSONFiles(translations);
    validateTranslations(translations);

    console.log('\n🎉 Translation processing complete!\n');
  } catch (error) {
    console.error('❌ Error processing translations:', error);
    process.exit(1);
  }
}

main();
