#!/usr/bin/env node
/**
 * Bundles the whole generated site into ONE self-contained .html file.
 *
 *   node build.mjs && node build-bundle.mjs
 *
 * Every page (30 of them, ES + EN) is embedded as an inert <template>; CSS, JS
 * and images are inlined, so the file works with no network at all. Navigation
 * between pages is swapped client-side, which keeps in-page #anchors working.
 *
 * Images are read from IMG_DIR (smaller re-encodes produced for embedding) and
 * fall back to assets/img when a file is missing there.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = process.env.IMG_DIR || '/tmp/artimg';
const ARGS = process.argv.slice(2);
const OUT = ARGS.find((a) => !a.startsWith('--')) || join(ROOT, 'preview', 'best-cabo-adventures.html');

const TOURS = JSON.parse(readFileSync(join(ROOT, 'data/tours.json'), 'utf8'));
const I18N = JSON.parse(readFileSync(join(ROOT, 'data/i18n.json'), 'utf8'));

/* ---------------------------------------------------------------- pages -- */
// route id -> file, and the absolute site path each one lives at
const pages = [
  { id: 'es:home', file: 'index.html', path: '/' },
  { id: 'en:home', file: 'en/index.html', path: '/en/' }
];
for (const t of TOURS) {
  pages.push({ id: `es:${t.slug.es}`, file: `tours/${t.slug.es}/index.html`, path: `/tours/${t.slug.es}/` });
  pages.push({ id: `en:${t.slug.en}`, file: `en/tours/${t.slug.en}/index.html`, path: `/en/tours/${t.slug.en}/` });
}
const byPath = new Map(pages.map((p) => [p.path, p.id]));

/* ---------------------------------------------------------------- assets -- */
const MIME = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml' };
const dataUriCache = new Map();

function dataUri(assetPath) {
  // assetPath is site-absolute, e.g. /assets/img/tours/clear-boat-card.webp
  if (dataUriCache.has(assetPath)) return dataUriCache.get(assetPath);
  const rel = assetPath.replace(/^\/assets\//, '');
  const candidates = [join(IMG_DIR, rel.replace(/^img\//, '')), join(ROOT, 'assets', rel)];
  const found = candidates.find((c) => existsSync(c));
  if (!found) { dataUriCache.set(assetPath, null); return null; }
  const ext = found.split('.').pop().toLowerCase();
  const uri = `data:${MIME[ext] || 'application/octet-stream'};base64,${readFileSync(found).toString('base64')}`;
  dataUriCache.set(assetPath, uri);
  return uri;
}

/* Each image is emitted ONCE into a shared map and referenced by key.
   Inlining the data URI at every <img> would repeat the same base64 on every
   page that shows the tour — that alone tripled the bundle. */
const assetKeys = new Map();
function assetKey(assetPath) {
  if (assetKeys.has(assetPath)) return assetKeys.get(assetPath);
  const uri = dataUri(assetPath);
  if (!uri) { assetKeys.set(assetPath, null); return null; }
  const k = 'a' + assetKeys.size;
  assetKeys.set(assetPath, k);
  return k;
}
const assetMapJson = () => JSON.stringify(
  Object.fromEntries([...assetKeys].filter(([, k]) => k).map(([p, k]) => [k, dataUriCache.get(p)]))
);

/** Resolve an href/src that appears on `pagePath` into a site-absolute path. */
const resolve = (pagePath, ref) => posix.normalize(posix.join(pagePath, ref));

/* ------------------------------------------------------------- transform -- */
function bodyOf(html) {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  if (!m) throw new Error('no <body> found');
  return m[1]
    .replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '')  // app.js is inlined once, globally
    .replace(/<a class="skip"[\s\S]*?<\/a>/, '');           // one skip link for the whole bundle
}

function rewrite(html, pagePath) {
  // 1. images become keys into the shared asset map (drop srcset: one size inline)
  html = html
    .replace(/\ssrcset="[^"]*"/g, '')
    .replace(/\ssizes="[^"]*"/g, '')
    .replace(/\s(src|data-full)="([^"]+)"/g, (m0, attr, ref) => {
      if (/^(https?:|data:|#)/.test(ref)) return m0;
      const k = assetKey(resolve(pagePath, ref));
      if (!k) return m0;
      return attr === 'src' ? ` data-img="${k}"` : ` data-fullimg="${k}"`;
    });

  // 2. internal links become client-side route swaps; external ones stay put
  html = html.replace(/href="([^"]+)"/g, (m0, ref) => {
    if (/^(https?:|mailto:|tel:|data:)/.test(ref)) return m0;
    if (ref.startsWith('#')) return `href="${ref}" data-anchor="${ref.slice(1)}"`;
    const [pathPart, hash] = ref.split('#');
    const abs = resolve(pagePath, pathPart || './');
    const target = byPath.get(abs.endsWith('/') ? abs : abs + '/');
    if (!target) return m0;
    return `href="#" data-route="${target}"${hash ? ` data-anchor="${hash}"` : ''}`;
  });

  return html;
}

/* ---------------------------------------------------------------- build -- */
const templates = pages.map((p) => {
  const raw = readFileSync(join(ROOT, p.file), 'utf8');
  return `<template data-id="${p.id}">${rewrite(bodyOf(raw), p.path)}</template>`;
}).join('\n');

const css = readFileSync(join(ROOT, 'assets/css/styles.css'), 'utf8')
  .replace(/url\("(\/?assets\/[^"]+)"\)/g, (m0, ref) => {
    const uri = dataUri(ref.startsWith('/') ? ref : '/' + ref);
    return uri ? `url("${uri}")` : m0;
  });

// app.js is an IIFE; expose its body so it can re-run after each view swap
const appSrc = readFileSync(join(ROOT, 'assets/js/app.js'), 'utf8');
const appBody = appSrc.replace(/^[\s\S]*?\(function \(\) \{/, '').replace(/\}\)\(\);\s*$/, '');

const favicon = dataUri('/assets/favicon.svg');

/* --artifact emits a fragment: the Artifact host supplies doctype/html/head/body. */
const ARTIFACT = ARGS.includes('--artifact');

const docOpen = ARTIFACT ? '' : `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
${favicon ? `<link rel="icon" href="${favicon}" type="image/svg+xml">` : ''}`;
const headClose = ARTIFACT ? '' : '</head>\n<body>';
const docClose = ARTIFACT ? '' : '</body>\n</html>';

const html = `${docOpen}
<title>Best Cabo Adventures — tours en Los Cabos</title>
<style>
${css}
/* ---- preview shell: the only styling added on top of the real site ---- */
.preview-note{
  position:fixed; inset:auto auto 0 0; z-index:120;
  display:flex; align-items:center; gap:.5rem;
  margin:.6rem; padding:.45rem .8rem; border-radius:var(--r-full);
  background:var(--deep); color:var(--on-deep-2);
  font:600 .72rem/1.3 var(--sans); letter-spacing:.02em;
  box-shadow:var(--sh-2); opacity:.9;
  /* must never swallow clicks meant for the page underneath */
  pointer-events:none;
}
.preview-note b{color:#fff;font-weight:750}
.preview-note button{
  border:0;background:none;color:inherit;cursor:pointer;padding:0 .1rem;font-size:1rem;line-height:1;opacity:.7;
  pointer-events:auto;
}
.preview-note button:hover{opacity:1}
@media (max-width:719px){ .preview-note{ bottom:4.4rem; font-size:.68rem } }
</style>
${headClose}
<a class="skip" href="#main">Saltar al contenido</a>
<div id="app"></div>

<p class="preview-note" role="status">
  <b>Vista previa</b> · sitio completo en un archivo — la navegación funciona
  <button type="button" aria-label="Ocultar aviso" onclick="this.parentNode.remove()">&times;</button>
</p>

${templates}

<script>
document.documentElement.classList.add('js');

/* the real site's script, re-runnable after each view swap */
window.__initApp = function () {
${appBody}
};

(function () {
  var ASSETS = ${assetMapJson()};
  var app = document.getElementById('app');
  var views = {};
  document.querySelectorAll('template[data-id]').forEach(function (t) { views[t.dataset.id] = t; });

  function hydrate(root) {
    root.querySelectorAll('[data-img]').forEach(function (el) {
      var u = ASSETS[el.dataset.img];
      if (u) el.setAttribute('src', u);
    });
    root.querySelectorAll('[data-fullimg]').forEach(function (el) {
      var u = ASSETS[el.dataset.fullimg];
      if (u) el.setAttribute('data-full', u);
    });
  }

  var current = null;

  function render(id, anchor) {
    var t = views[id];
    if (!t) return;
    // already on this page: just scroll, don't rebuild the DOM
    if (id === current && anchor) {
      var here = document.getElementById(anchor);
      if (here) { here.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
    var frag = t.content.cloneNode(true);
    hydrate(frag);
    app.replaceChildren(frag);
    current = id;
    document.documentElement.lang = id.indexOf('en:') === 0 ? 'en' : 'es';
    window.__initApp();
    bind();
    if (anchor) {
      var el = document.getElementById(anchor);
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }

  function bind() {
    app.querySelectorAll('[data-route]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        render(a.dataset.route, a.dataset.anchor || '');
      });
    });
    // in-page anchors: smooth-scroll without touching the URL
    app.querySelectorAll('a[data-anchor]:not([data-route])').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var el = document.getElementById(a.dataset.anchor);
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  render('es:home');
})();
</script>
${docClose}
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
const mb = (Buffer.byteLength(html) / 1e6).toFixed(2);
const nAssets = [...assetKeys.values()].filter(Boolean).length;
console.log(`Bundled ${pages.length} pages + ${nAssets} unique assets -> ${OUT} (${mb} MB)`);
if (Buffer.byteLength(html) > 16e6) console.error('WARNING: over the 16 MB artifact limit');
