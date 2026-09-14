import { copyFile, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { marked } from 'marked';

const root = resolve(import.meta.dirname, '..');
const destination = resolve(root, 'public/livrables');
await mkdir(destination, { recursive: true });
const benchmarkDestination = resolve(destination, 'benchmarks');
await mkdir(benchmarkDestination, { recursive: true });

const benchmarkFiles = [
  'food101-benchmark.json',
  'food101-stratified-full-benchmark.json',
  'food101-grid-benchmark.json',
  'browser-latency.json',
  'browser-preprocessing-ablation.json',
];

await Promise.all(benchmarkFiles.map((fileName) =>
  copyFile(resolve(root, 'evaluation', fileName), resolve(benchmarkDestination, fileName)),
));

const documents = [
  ['rapport-conduite-projet', 'Rapport de conduite de projet'],
  ['model-card', 'Model card'],
  ['data-card', 'Data card'],
  ['evaluation', 'Protocole d’évaluation'],
  ['architecture', 'Architecture'],
  ['journal-decisions', 'Journal de décisions'],
  ['competences', 'Inventaire des compétences'],
  ['scenario-demonstration', 'Scénario de démonstration'],
  ['audit-mapping-food101', 'Audit du mapping Food-101'],
];

marked.use({ gfm: true, breaks: false });

const stylesheet = `
  :root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#17231c;background:#f4f0e7;line-height:1.65}
  *{box-sizing:border-box}body{margin:0}header{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;padding:16px max(24px,calc((100vw - 980px)/2));background:#173f2d;color:white;z-index:2}
  header a{color:#d9ed83;font-weight:700}main{max-width:980px;margin:auto;padding:64px 24px 100px;background:#fffdf8;box-shadow:0 0 70px rgba(24,50,33,.08)}
  h1,h2,h3{font-family:Georgia,serif;font-weight:400;line-height:1.15}h1{font-size:48px;color:#1f5c43;border-bottom:5px solid #ef6b3e;padding-bottom:24px}h2{font-size:32px;margin-top:56px;color:#1f5c43}h3{font-size:23px;margin-top:36px}
  a{color:#1f5c43;text-underline-offset:3px}table{width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;display:block;overflow:auto}th,td{border:1px solid #d8d9d0;padding:10px 12px;text-align:left;vertical-align:top}th{background:#e8edd3}
  code{background:#efeee8;padding:2px 5px;border-radius:3px}pre{overflow:auto;padding:18px;background:#17231c;color:#e9f2e8;border-radius:5px}pre code{background:transparent;padding:0}blockquote{margin:24px 0;padding:8px 22px;border-left:5px solid #ef6b3e;background:#f7eee7}li{margin:.35em 0}hr{border:0;border-top:1px solid #d8d9d0;margin:48px 0}
  .meta{font-size:13px;color:#c4d1c9}.print{border:1px solid #d9ed83;padding:7px 10px;border-radius:3px;text-decoration:none}
  @media(max-width:640px){h1{font-size:34px}h2{font-size:27px}main{padding:40px 18px}header{padding:12px 18px}.meta{display:none}}
  @media print{header{display:none}body,main{background:white}main{max-width:none;padding:0;box-shadow:none}h1{font-size:34px}h2{font-size:25px;break-after:avoid}h3{break-after:avoid}table,pre,blockquote{break-inside:avoid}a{color:inherit;text-decoration:none}}
`;

for (const [slug, title] of documents) {
  const markdown = await readFile(resolve(root, `docs/${slug}.md`), 'utf8');
  const body = await marked.parse(markdown);
  const rewritten = body.replace(/href="(?:\.\/)?([a-z-]+)\.md"/g, 'href="$1.html"');
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${title} — EcoPlate Edge</title><style>${stylesheet}</style></head><body><header><a href="../index.html">← EcoPlate Edge</a><span class="meta">Livrable du portfolio</span><a class="print" href="#" onclick="window.print();return false">Imprimer / PDF</a></header><main>${rewritten}</main></body></html>`;
  await writeFile(resolve(destination, `${slug}.html`), html);
  if (slug === 'rapport-conduite-projet') {
    const printHtml = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title} — EcoPlate Edge</title><style>${stylesheet}body{background:white}main{box-shadow:none}</style></head><body><main>${rewritten}</main></body></html>`;
    await writeFile(resolve(destination, `${slug}-print.html`), printHtml);
  }
}
