import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/configure-seo.mjs https://your-public-domain/ [--dry-run]');
  console.log('Sets canonical, social URLs, schema URLs, robots.txt and sitemap.xml. Use the final public URL only.');
  process.exit(0);
}
const input = args.find(arg => !arg.startsWith('--')) || process.env.PUBLIC_SITE_URL;
if (!input) { console.error('Provide the final public HTTPS URL. Nothing has been changed.'); process.exit(2); }
let base;
try { base = new URL(input); } catch { console.error('Invalid URL. Use https://your-public-domain/'); process.exit(2); }
if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(base.hostname)) {
  console.error('Use a public HTTPS homepage URL without credentials, query parameters or a fragment.'); process.exit(2);
}
base.pathname = base.pathname.replace(/\/index\.html?$/, '/');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const homepage = base.href;
const absolute = relative => new URL(relative, homepage).href;
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!schemaMatch) throw new Error('Structured business data not found.');
const schema = JSON.parse(schemaMatch[1]);
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'site-content.js'), 'utf8'), context);
const content = context.window.TIRANA_CONTENT;
const shareRelative = 'assets/optimized/kompani-pastrimi-tirana-share.jpg';
if (!fs.existsSync(path.join(root, shareRelative))) throw new Error('Sharing image missing.');
const share = absolute(shareRelative);
function normalizeIds(value) {
  if (Array.isArray(value)) return value.map(normalizeIds);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (key === '@id' && typeof item === 'string' && item.includes('#')) return [key, absolute('#' + item.split('#').pop())];
    return [key, normalizeIds(item)];
  }));
  return value;
}
const graph = normalizeIds(schema['@graph']);
for (const node of graph) {
  if (['LocalBusiness', 'WebSite', 'WebPage'].includes(node['@type'])) node.url = homepage;
  if (node['@type'] === 'LocalBusiness') {
    node.logo = { '@type': 'ImageObject', url: absolute('assets/optimized/kompani-pastrimi-tirana-logo.webp'), width: 512, height: 512 };
    node.image = [absolute(content.comparisons[0].afterDisplay || content.comparisons[0].after)];
  }
  if (node['@type'] === 'WebPage') node.primaryImageOfPage = { '@type': 'ImageObject', url: share, width: 1200, height: 630 };
  if (node['@type'] === 'Service') node.url = node['@id'];
}
schema['@graph'] = graph;
html = html.replace(schemaMatch[0], '<script type="application/ld+json">' + JSON.stringify(schema).replaceAll('<', '\\u003c') + '</script>');
html = html.replace(/\s*<link rel="canonical"[^>]*>/g, '');
html = html.replace('</head>', '  <link rel="canonical" href="' + escape(homepage) + '">\n</head>');
function setMeta(attribute, key, value) {
  const pattern = new RegExp('\\s*<meta ' + attribute + '="' + key + '"[^>]*>', 'g');
  html = html.replace(pattern, '');
  html = html.replace('</head>', '  <meta ' + attribute + '="' + key + '" content="' + escape(value) + '">\n</head>');
}
setMeta('property', 'og:url', homepage);
setMeta('property', 'og:image', share);
setMeta('property', 'og:image:type', 'image/jpeg');
setMeta('property', 'og:image:width', '1200');
setMeta('property', 'og:image:height', '630');
setMeta('property', 'og:image:alt', 'Kompani Pastrimi Tirana — larje këndesh, divanesh dhe dyshekësh. Telefon: 069 98 13 229.');
setMeta('name', 'twitter:image', share);
setMeta('name', 'twitter:image:alt', 'Kompani Pastrimi Tirana — shërbime profesionale pastrimi.');
const timestamps = ['index.html', 'site-content.js', 'styles.css', 'mix.css', 'tirana.css'].map(name => fs.statSync(path.join(root, name)).mtimeMs);
const lastModified = new Date(Math.max(...timestamps)).toISOString().slice(0, 10);
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>' + escape(homepage) + '</loc><lastmod>' + lastModified + '</lastmod></url>\n</urlset>\n';
const robots = 'User-agent: *\nAllow: /\nDisallow: ' + base.pathname + 'scripts/\n\nSitemap: ' + absolute('sitemap.xml') + '\n';
if (args.includes('--dry-run')) {
  console.log('Dry run passed. Canonical: ' + homepage + '; schema entities: ' + graph.length + '; sitemap URLs: 1. No files written.');
} else {
  fs.writeFileSync(path.join(root, 'index.html'), html);
  fs.writeFileSync(path.join(root, 'robots.txt'), robots);
  fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);
  console.log('Configured canonical, social URLs, schema, robots.txt and sitemap.xml for ' + homepage);
}
