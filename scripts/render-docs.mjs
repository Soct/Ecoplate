import { copyFile, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { marked } from 'marked';

const root = resolve(import.meta.dirname, '..');
const destination = resolve(root, 'public/annexes');
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
  ['rapport-conduite-projet', 'Rapport de projet'],
  ['model-card', 'Fiche modèle'],
  ['data-card', 'Données environnementales'],
  ['evaluation', 'Résultats et évaluation'],
  ['architecture', 'Architecture technique'],
  ['journal-decisions', 'Décisions techniques'],
  ['competences', 'Compétences démontrées'],
  ['projets-formation', 'Projets de formation'],
  ['scenario-demonstration', 'Guide de démonstration'],
  ['audit-mapping-food101', 'Audit du mapping Food-101'],
];

marked.use({ gfm: true, breaks: false });

const stylesheet = `
  :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1d2b24;background:#f5f7f2;line-height:1.65}
  *{box-sizing:border-box}body{margin:0;background:#f5f7f2}header{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:16px max(24px,calc((100vw - 1320px)/2));border-bottom:1px solid #cfdad1;background:rgba(245,247,242,.96);color:#1d2b24;z-index:2}
  header a{color:#2d6a48;font-weight:800;text-underline-offset:3px}.meta{font-size:13px;color:#607067}main{max-width:1100px;margin:auto;padding:64px 48px 100px;background:#fff;box-shadow:0 14px 35px rgba(29,43,36,.08)}
  h1,h2,h3{font-family:Arial,Helvetica,sans-serif;font-weight:800;letter-spacing:-.055em;line-height:1.05}h1{font-size:clamp(38px,5vw,64px);color:#1d2b24;border-bottom:2px solid #b55c48;padding-bottom:24px}h2{font-size:clamp(28px,3.5vw,44px);margin-top:56px;color:#2d6a48}h3{font-size:24px;margin-top:36px}
  a{color:#2d6a48}table{width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;display:block;overflow:auto}th,td{border:1px solid #cfdad1;padding:10px 12px;text-align:left;vertical-align:top}th{background:#e7eee8}
  code{background:#e7eee8;padding:2px 5px;border-radius:3px}pre{overflow:auto;padding:18px;background:#1d2b24;color:#f5f7f2;border-radius:0}pre code{background:transparent;padding:0}blockquote{margin:24px 0;padding:12px 22px;border-left:4px solid #b55c48;background:#f5eee9}li{margin:.35em 0}hr{border:0;border-top:1px solid #cfdad1;margin:48px 0}
  .print{border:1px solid #1d2b24;padding:7px 10px;border-radius:0;text-decoration:none;color:#1d2b24;font-size:13px;font-weight:800}.print:hover{background:#2d6a48;color:white}
  .print-page-break{display:none}
  @media(max-width:640px){h1{font-size:36px}h2{font-size:30px}main{padding:40px 18px}header{padding:12px 18px}.meta{display:none}}
  @media print{
    @page{size:A4;margin:14mm 13mm 15mm}
    header{display:none}
    html,body{font-size:10.2pt;line-height:1.42;background:white;orphans:3;widows:3}
    main{max-width:none;padding:0;box-shadow:none}
    h1,h2,h3{break-after:avoid-page;page-break-after:avoid}
    h1+*,h2+*,h3+*{break-before:avoid-page}
    h1{margin:0 0 14px;padding-bottom:10px;font-size:25pt}
    h1:not(:first-child){margin-top:24px}
    h2{margin-top:20px;font-size:18pt}
    h3{margin-top:14px;font-size:12.5pt;letter-spacing:-.025em}
    p{margin-bottom:7px;break-inside:avoid-page;page-break-inside:avoid}
    ul,ol{margin-top:6px;margin-bottom:9px;padding-left:20px}
    li{margin:.15em 0;break-inside:avoid-page;page-break-inside:avoid}
    table{display:table;width:100%;margin:10px 0 14px;overflow:visible;font-size:8.3pt;line-height:1.3;break-inside:auto}
    thead{display:table-header-group;break-after:avoid-page;page-break-after:avoid}
    tr{break-inside:avoid-page;page-break-inside:avoid}
    .rapport-conduite-projet table:nth-of-type(4),.rapport-conduite-projet table:nth-of-type(5),.rapport-conduite-projet table:nth-of-type(6),.rapport-conduite-projet table:nth-of-type(7),.rapport-conduite-projet table:nth-of-type(8),.rapport-conduite-projet table:nth-of-type(9),.rapport-conduite-projet table:nth-of-type(11){break-inside:avoid-page;page-break-inside:avoid}
    .print-page-break{display:block;break-before:page;page-break-before:always}
    th,td{padding:5px 6px}
    pre,blockquote{margin:10px 0;padding:10px 12px;break-inside:avoid-page}
    code{font-size:.9em}
    a{color:inherit;text-decoration:none}
  }
`;

for (const [slug, title] of documents) {
  const markdown = await readFile(resolve(root, `docs/${slug}.md`), 'utf8');
  const body = await marked.parse(markdown);
  const rewritten = body
    .replace(/href="(?:\.\/)?([a-z0-9-]+)\.md(?=[#"])/g, 'href="$1.html')
    // Marked 18 ne génère plus d'identifiants de titres par défaut. Retirer les
    // fragments évite des ancres mortes tout en ouvrant le bon livrable.
    .replace(/href="([a-z0-9-]+\.html)#[^"]+"/g, 'href="$1"')
    .replace(/href="\.\.\/public\/livrables\//g, 'href="../livrables/');
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${title} — EcoPlate Edge</title><style>${stylesheet}</style></head><body class="${slug}"><header><a href="../index.html">← Retour au portfolio</a><span class="meta">Documentation EcoPlate Edge</span><a class="print" href="#" onclick="window.print();return false">Imprimer / PDF</a></header><main>${rewritten}</main></body></html>`;
  await writeFile(resolve(destination, `${slug}.html`), html);
  if (slug === 'rapport-conduite-projet') {
    const printHtml = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title} — EcoPlate Edge</title><style>${stylesheet}body{background:white}main{box-shadow:none}</style></head><body class="${slug}"><main>${rewritten}</main></body></html>`;
    await writeFile(resolve(destination, `${slug}-print.html`), printHtml);
  }
}
