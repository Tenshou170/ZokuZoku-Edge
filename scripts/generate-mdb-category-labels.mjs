// Regenerates src/editors/mdbTextDataCategories.ts from primary sources:
//
//   1. The game's master.mdb — the authoritative set of text_data category ids.
//   2. PakuPaku's webviews/src/locales/en.json — English labels keyed by id
//      (`mdb.category.<id>`), which track new game content.
//   3. ZokuZoku's pre-rename git history (c4fcc03^) — the old label strings,
//      used to reattach existing bundle.l10n.zh-cn.json translations.
//
// The generated table is keyed by CATEGORY ID, never by label, so renaming a
// label can never orphan its translations again (the c4fcc03 regression).
//
// Usage:
//   node scripts/generate-mdb-category-labels.mjs \
//     --mdb /path/to/master.mdb \
//     --pakupaku /path/to/PakuPaku
//
// After running this, re-run `pnpm run l10n:export` to refresh the bundles.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const REPO = path.resolve(new URL('..', import.meta.url).pathname);
const OLD_TABLE_REF = 'c4fcc03^'; // last commit with the "> Label" wrapper names
const OLD_TABLE_FILE = 'src/editors/mdbTextDataCategories.ts';

function parseArgs() {
  const args = { mdb: null, pakupaku: null };
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--mdb') args.mdb = process.argv[++i];
    if (process.argv[i] === '--pakupaku') args.pakupaku = process.argv[++i];
  }
  if (!args.mdb || !args.pakupaku) {
    console.error('usage: node scripts/generate-mdb-category-labels.mjs --mdb <master.mdb> --pakupaku <PakuPaku repo>');
    process.exit(1);
  }
  return args;
}

const { mdb: MDB, pakupaku: PAKU } = parseArgs();

// ---------- 1. game ids ----------
const gameIds = JSON.parse(
  execSync(`sqlite3 -json -readonly "${MDB}" "SELECT DISTINCT category AS c FROM text_data ORDER BY c"`)
).map(r => String(r.c));
console.log(`game text_data categories: ${gameIds.length}`);

// ---------- 2. PakuPaku en labels ----------
const pakuEnRaw = JSON.parse(fs.readFileSync(path.join(PAKU, 'webviews/src/locales/en.json'), 'utf8'));
const pakuEn = Object.fromEntries(
  Object.entries(pakuEnRaw)
    .filter(([k]) => k.startsWith('mdb.category.'))
    .map(([k, v]) => [k.slice('mdb.category.'.length), v])
);
const missing = gameIds.filter(id => pakuEn[id] === undefined);
if (missing.length) {
  console.error(`FATAL: PakuPaku has no label for game category ids: ${missing.join(',')}`);
  console.error('Update the PakuPaku checkout and retry.');
  process.exit(1);
}

// ---------- 3. pre-rename table, for zh recovery ----------
const oldSrc = execSync(`git -C "${REPO}" show '${OLD_TABLE_REF}:${OLD_TABLE_FILE}'`, { encoding: 'utf8' });
const oldTable = (() => {
  const start = oldSrc.indexOf('{', oldSrc.indexOf('='));
  let depth = 0, end = -1, inS = null;
  for (let i = start; i < oldSrc.length; i++) {
    const c = oldSrc[i];
    if (inS) { if (c === '\\') i++; else if (c === inS) inS = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (!depth) { end = i; break; } }
  }
  const body = oldSrc.slice(start, end + 1);
  return new Function('vscode', `return (${body});`)({ l10n: { t: s => s } });
})();

// ---------- 4. current zh bundle ----------
const zhPath = path.join(REPO, 'l10n/bundle.l10n.zh-cn.json');
const zhBundle = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

// ---------- 5. emit the generated TS table ----------
const entries = gameIds.map(id => {
  const en = pakuEn[id];
  const old = oldTable[id]; // e.g. "> Characters Name" or undefined
  const zhVal = old !== undefined && zhBundle[old] !== undefined ? zhBundle[old].replace(/^> /, '') : null;
  return { id, en, old, zhVal };
});

const tableBody = entries.map(e => `    ${JSON.stringify(e.id)}: ${JSON.stringify(e.en)},`).join('\n');
const generatedAt = new Date().toISOString().slice(0, 10);
const ts = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-mdb-category-labels.mjs --mdb <master.mdb> --pakupaku <PakuPaku repo>
// Source: master.mdb text_data category ids (${gameIds.length}) + PakuPaku en labels, ${generatedAt}.
//
// Labels are keyed by CATEGORY ID so that a label rename can never orphan the
// translations attached to it. Translations are resolved at runtime through
// vscode.l10n with the \`mdb.category.<id>\` keys seeded into the l10n bundles
// by scripts/extract-l10n.mjs; this table doubles as the English fallback.
import * as vscode from 'vscode';

const KEY_PREFIX = 'mdb.category.';

// English labels by text_data category id.
export const EN_LABELS: { [id: string]: string } = {
${tableBody}
};

/**
 * Resolves a category label for the current UI language.
 * Falls back to the English label when the bundle has no entry.
 */
export function getMdbCategoryName(id: string): string | undefined {
    if (!(id in EN_LABELS)) {
        return undefined;
    }
    const key = KEY_PREFIX + id;
    const translated = vscode.l10n.t(key);
    // vscode.l10n.t returns the input unchanged when the bundle has no match.
    return translated !== key ? translated : EN_LABELS[id];
}

// Index-style access, matching the previous hand-written table so call sites
// keep working unchanged: \`categories["6"] ?? ""\`.
export default new Proxy<Record<string, string | undefined>>({}, {
    get(_target, prop: string | symbol) {
        return typeof prop === 'string' ? getMdbCategoryName(prop) : undefined;
    }
});
`;

const outTs = path.join(REPO, 'src/editors/mdbTextDataCategories.ts');
fs.writeFileSync(outTs, ts);
console.log(`wrote ${path.relative(REPO, outTs)} (${entries.length} ids)`);

// ---------- 6. migrate zh translations onto id keys ----------
let migrated = 0, untranslated = 0;
for (const e of entries) {
  zhBundle[`mdb.category.${e.id}`] = e.zhVal ?? e.en; // en passthrough where no translation exists
  if (e.zhVal) migrated++; else untranslated++;
}
fs.writeFileSync(zhPath, JSON.stringify(zhBundle, null, 4) + '\n');
console.log(`zh-cn bundle: ${migrated} recovered translations + ${untranslated} en-passthrough (new content)`);

// ---------- 7. seed manifest for the exporter ----------
// extract-l10n.mjs injects one vscode.l10n.t("mdb.category.<id>") call per id
// so the dynamic lookups above are reachable for the string scanner.
fs.writeFileSync(
  path.join(REPO, 'scripts/mdb-category-ids.json'),
  JSON.stringify(gameIds, null, 1) + '\n'
);
console.log('wrote scripts/mdb-category-ids.json (exporter seed)');
