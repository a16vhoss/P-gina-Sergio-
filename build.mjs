#!/usr/bin/env node
/**
 * Best Cabo Adventures — static site generator.
 * Reads data/*.json and writes the whole bilingual site to the repo root.
 *
 *   node build.mjs
 *
 * Output: index.html, en/index.html, tours/<slug>/index.html,
 *         en/tours/<slug>/index.html, 404.html, sitemap.xml, robots.txt
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const SITE = read('data/site.json');
const TOURS = read('data/tours.json');
const I18N = read('data/i18n.json');
const LANGS = ['es', 'en'];
const BUILT = new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------- helpers -- */
const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = (s = '') => esc(s).replace(/'/g, '&#39;');
const up = (n) => (n > 0 ? '../'.repeat(n) : '');
const money = (n) => '$' + Number(n).toFixed(0);
const clean = (s) => String(s).replace(/\s+/g, ' ').trim();

const homeUrl = (lang, d) => (up(d) + (lang === 'en' ? 'en/' : '')) || './';
const tourUrl = (lang, t, d) => up(d) + (lang === 'en' ? 'en/tours/' : 'tours/') + t.slug[lang] + '/';
const asset = (p, d) => up(d) + 'assets/' + p;
const absHome = (lang) => SITE.url + '/' + (lang === 'en' ? 'en/' : '');
const absTour = (lang, t) => SITE.url + '/' + (lang === 'en' ? 'en/tours/' : 'tours/') + t.slug[lang] + '/';

const wa = (msg) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(msg)}`;

/* --------------------------------------------------------------- icons -- */
const P = (d, extra = '') => `<path d="${d}"${extra}/>`;
const svg = (body, box = 24) =>
  `<svg viewBox="0 0 ${box} ${box}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

const ICON = {
  clock: svg(`<circle cx="12" cy="12" r="9"/>${P('M12 7v5l3 2')}`),
  arrow: svg(P('M5 12h14M13 6l6 6-6 6')),
  check: svg(P('m5 13 4 4L19 7')),
  shield: svg(`${P('M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z')}${P('m9 12 2 2 4-4')}`),
  users: svg(`${P('M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19')}<circle cx="10" cy="8" r="3.2"/>${P('M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4')}${P('M15.5 5.2a3.2 3.2 0 0 1 0 5.6')}`),
  globe: svg(`<circle cx="12" cy="12" r="9"/>${P('M3 12h18')}${P('M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z')}`),
  leaf: svg(`${P('M4 20c0-8 5-13 16-14 0 10-4 15-11 15-2.5 0-5-1-5-1z')}${P('M9 15c1.5-3 3.5-5 6-6.5')}`),
  tag: svg(`${P('M3 12.5V4h8.5L21 13.5 13.5 21z')}<circle cx="7.8" cy="7.8" r="1.4"/>`),
  phone: svg(P('M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3z')),
  mail: svg(`<rect x="3" y="5" width="18" height="14" rx="2.5"/>${P('m3.5 7 8.5 6 8.5-6')}`),
  pin: svg(`${P('M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z')}<circle cx="12" cy="10" r="2.6"/>`),
  cal: svg(`<rect x="3" y="5" width="18" height="16" rx="2.5"/>${P('M3 10h18M8 3v4M16 3v4')}`),
  menu: svg(P('M4 7h16M4 12h16M4 17h16')),
  close: svg(P('M6 6l12 12M18 6 6 18')),
  chevL: svg(P('m14 6-6 6 6 6')),
  chevR: svg(P('m10 6 6 6-6 6')),
  spark: svg(`${P('M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z')}${P('M18.5 15.5 19 17l1.5.5-1.5.5-.5 1.5-.5-1.5L16.5 17l1.5-.5z')}`),
  alert: svg(`<circle cx="12" cy="12" r="9"/>${P('M12 7.5v5.5M12 16.2v.1')}`),
  wa: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2 22l5.36-1.4a9.8 9.8 0 0 0 4.68 1.2h.01c5.43 0 9.84-4.4 9.84-9.84C21.89 6.4 17.47 2 12.04 2Zm5.76 14.06c-.24.68-1.4 1.3-1.94 1.34-.5.05-.98.23-3.3-.69-2.78-1.1-4.54-3.94-4.68-4.13-.13-.19-1.11-1.48-1.11-2.82 0-1.34.7-2 .95-2.28.25-.27.55-.34.73-.34.18 0 .37 0 .53.01.17.01.4-.06.63.48.24.57.8 1.97.87 2.11.07.14.12.3.02.49-.1.19-.15.3-.29.47-.15.16-.31.37-.44.5-.15.14-.3.3-.13.59.17.29.75 1.24 1.61 2 1.11.99 2.04 1.3 2.33 1.44.29.15.46.12.63-.07.17-.19.73-.85.92-1.14.19-.29.39-.24.65-.15.26.1 1.66.78 1.94.92.29.15.48.22.55.34.07.12.07.68-.17 1.34Z"/></svg>`,
  fb: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z"/></svg>`,
  ig: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.98c-3.15 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.59-.07 4.74s.01 3.5.07 4.74c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.05-1.14-.24-1.76-.4-2.17-.21-.55-.47-.94-.88-1.35-.41-.41-.8-.67-1.35-.88-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.59-.07-4.74-.07Zm0 3.37a5.49 5.49 0 1 1 0 10.98 5.49 5.49 0 0 1 0-10.98Zm0 9.05a3.56 3.56 0 1 0 0-7.12 3.56 3.56 0 0 0 0 7.12Zm6.99-9.27a1.28 1.28 0 1 1-2.56 0 1.28 1.28 0 0 1 2.56 0Z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="m12 2.6 2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.44 6.19 20.5l1.1-6.47L2.6 9.45l6.5-.95z"/></svg>`
};

const CAT_ICON = { ocean: 'globe', adventure: 'spark', horseback: 'spark', camel: 'spark', cycling: 'spark', culture: 'tag' };

/* ------------------------------------------------------------- partials -- */
function head({ lang, title, desc, canonical, alt, d, extraLd = [], ogImage }) {
  const t = I18N[lang];
  const ld = extraLd.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n  ');
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${attr(desc)}">
  <meta name="theme-color" content="#071a24">
  <meta name="author" content="${attr(SITE.name)}">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="es" href="${alt.es}">
  <link rel="alternate" hreflang="en" href="${alt.en}">
  <link rel="alternate" hreflang="x-default" href="${alt.es}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${attr(SITE.name)}">
  <meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'es_MX'}">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attr(title)}">
  <meta name="twitter:description" content="${attr(desc)}">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="icon" href="${asset('favicon.svg', d)}" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${asset('img/logo.webp', d)}">
  <link rel="manifest" href="${up(d)}site.webmanifest">
  <link rel="preload" as="style" href="${asset('css/styles.css', d)}">
  <link rel="stylesheet" href="${asset('css/styles.css', d)}">
  <script>document.documentElement.classList.add('js')</script>
  ${ld}`;
}

function header(lang, d, altHref) {
  const t = I18N[lang];
  const other = lang === 'es' ? 'en' : 'es';
  const h = homeUrl(lang, d);
  const nav = [
    [h + '#tours', t.nav.tours],
    [h + '#why', t.nav.why],
    [h + '#how', t.nav.how],
    [h + '#faq', t.nav.faq],
    [h + '#contact', t.nav.contact]
  ];
  return `<header class="site-header">
  <div class="wrap header-in">
    <a class="brand" href="${h}">
      <img src="${asset('img/logo.webp', d)}" width="46" height="41" alt="${attr(SITE.name)}">
      <span class="brand-txt"><b>Best Cabo</b><span>Adventures</span></span>
    </a>
    <nav class="nav" aria-label="${attr(t.nav.menu)}">
      <ul>${nav.map(([u, l]) => `<li><a href="${u}">${esc(l)}</a></li>`).join('')}</ul>
    </nav>
    <div class="header-side">
      <a class="lang" href="${altHref}" hreflang="${other}" lang="${other}" rel="alternate">${ICON.globe}${esc(I18N[other].dir)}</a>
      <a class="btn btn--wa btn--sm header-cta" href="${wa(t.contact.waMessage)}" target="_blank" rel="noopener">${ICON.wa}${esc(t.nav.book)}</a>
      <button class="burger" type="button" aria-expanded="false" aria-controls="mnav" aria-label="${attr(t.nav.menu)}">
        <span class="ic-open">${ICON.menu}</span><span class="ic-close">${ICON.close}</span>
      </button>
    </div>
  </div>
</header>
<div class="mobile-nav" id="mnav">
  ${nav.map(([u, l]) => `<a href="${u}">${esc(l)}</a>`).join('\n  ')}
  <a class="btn btn--wa" href="${wa(t.contact.waMessage)}" target="_blank" rel="noopener">${ICON.wa}${esc(t.nav.book)}</a>
</div>`;
}

function footer(lang, d) {
  const t = I18N[lang];
  const h = homeUrl(lang, d);
  const top = TOURS.slice(0, 6);
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="brand" href="${h}">
          <img src="${asset('img/logo.webp', d)}" width="46" height="41" alt="" loading="lazy">
          <span class="brand-txt"><b>Best Cabo</b><span>Adventures</span></span>
        </a>
        <p>${esc(t.footer.tagline)}</p>
        <div class="socials" style="margin-top:1.25rem">
          <a href="${SITE.social.facebook}" target="_blank" rel="noopener me" aria-label="Facebook">${ICON.fb}</a>
          <a href="${SITE.social.instagram}" target="_blank" rel="noopener me" aria-label="Instagram">${ICON.ig}</a>
        </div>
      </div>
      <div>
        <h4>${esc(t.footer.toursTitle)}</h4>
        <ul>${top.map((x) => `<li><a href="${tourUrl(lang, x, d)}">${esc(x.title[lang])}</a></li>`).join('')}
        <li><a href="${h}#tours"><strong>${esc(t.footer.allTours)}</strong></a></li></ul>
      </div>
      <div>
        <h4>${esc(t.footer.companyTitle)}</h4>
        <ul>
          <li><a href="${h}#why">${esc(t.nav.why)}</a></li>
          <li><a href="${h}#how">${esc(t.nav.how)}</a></li>
          <li><a href="${h}#faq">${esc(t.nav.faq)}</a></li>
          <li><a href="${h}#contact">${esc(t.nav.contact)}</a></li>
        </ul>
      </div>
      <div>
        <h4>${esc(t.footer.contactTitle)}</h4>
        <ul>
          <li><a href="tel:${SITE.phoneHref}">${esc(SITE.phoneDisplay)}</a></li>
          <li><a href="mailto:${SITE.email}">${esc(SITE.email)}</a></li>
          <li><a href="${wa(t.contact.waMessage)}" target="_blank" rel="noopener">WhatsApp</a></li>
          <li>${esc(t.contact.hoursValue)}</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© <span data-year>${new Date().getFullYear()}</span> ${esc(SITE.name)}. ${esc(t.footer.rights)}</p>
      <p class="footer-legal">${esc(t.footer.legal)}</p>
    </div>
  </div>
</footer>`;
}

function floats(lang, d, primaryHref, primaryLabel) {
  const t = I18N[lang];
  return `<a class="fab" href="${wa(t.contact.waMessage)}" target="_blank" rel="noopener" aria-label="${attr(t.fab)}">${ICON.wa}</a>
<div class="mobile-bar">
  <a class="btn btn--ghost" href="${primaryHref}">${esc(primaryLabel)}</a>
  <a class="btn btn--wa" href="${wa(t.contact.waMessage)}" target="_blank" rel="noopener">${ICON.wa}WhatsApp</a>
</div>`;
}

function page({ lang, d, title, desc, canonical, alt, ld, body, ogImage, bodyClass = '' }) {
  const t = I18N[lang];
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
  ${head({ lang, title, desc, canonical, alt, d, extraLd: ld, ogImage })}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
<a class="skip" href="#main">${esc(t.skip)}</a>
${body}
<script src="${asset('js/app.js', d)}" defer></script>
</body>
</html>`;
}

/* ----------------------------------------------------------- tour card -- */
function tourCard(lang, x, d, order) {
  const t = I18N[lang];
  const badges = (x.tags || [])
    .filter((tag) => ['bestseller', 'combo', 'new', 'premium'].includes(tag))
    .map((tag) => {
      const cls = tag === 'bestseller' ? ' badge--hot' : tag === 'combo' ? ' badge--combo' : '';
      return `<span class="badge${cls}">${esc(t.tag[tag])}</span>`;
    })
    .join('');
  const save = x.price.adultList > x.price.adult;
  return `<article class="card reveal" data-cat="${x.category}" data-tags="${(x.tags || []).join(' ')}" data-price="${x.price.adult}" data-hours="${x.hours}" data-order="${order}">
  <div class="card-media">
    ${badges ? `<div class="card-badges">${badges}</div>` : ''}
    <img src="${asset(`img/tours/${x.img}-card.webp`, d)}"
         srcset="${asset(`img/tours/${x.img}-card-sm.webp`, d)} 440w, ${asset(`img/tours/${x.img}-card.webp`, d)} 880w"
         sizes="(min-width: 1100px) 360px, (min-width: 700px) 45vw, 92vw"
         width="880" height="660" loading="lazy" decoding="async" alt="${attr(x.title[lang])}">
    <span class="card-dur">${ICON.clock}${x.hours}${esc(t.tours.hours)}</span>
    <span class="card-cat">${esc(t.cat[x.category])}</span>
  </div>
  <div class="card-body">
    <h3 class="card-title"><a href="${tourUrl(lang, x, d)}">${esc(x.title[lang])}</a></h3>
    <p class="card-sum">${esc(x.summary[lang])}</p>
    <div class="card-foot">
      <div class="price">
        <span class="from">${esc(t.tours.from)}</span>
        <span class="amount"><span class="now">${money(x.price.adult)}</span>${save ? `<span class="was">${money(x.price.adultList)}</span>` : ''}</span>
        <span class="unit">USD ${esc(t.tours.perAdult)} · ${esc(t.tours.perKid)} ${money(x.price.kid)}</span>
      </div>
      <span class="card-go" aria-hidden="true">${ICON.arrow}</span>
    </div>
  </div>
</article>`;
}

/* ---------------------------------------------------------------- home -- */
function homePage(lang) {
  const t = I18N[lang];
  const d = lang === 'en' ? 1 : 0;
  const cats = ['all', ...[...new Set(TOURS.map((x) => x.category))]];
  const counts = Object.fromEntries(cats.map((c) => [c, c === 'all' ? TOURS.length : TOURS.filter((x) => x.category === c).length]));

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      '@id': SITE.url + '/#org',
      name: SITE.name,
      url: SITE.url + '/',
      logo: SITE.url + '/assets/img/logo.webp',
      image: SITE.url + '/assets/img/og.jpg',
      description: t.meta.homeDesc,
      email: SITE.email,
      telephone: '+' + SITE.phoneHref.replace('+', ''),
      priceRange: '$$',
      currenciesAccepted: 'USD, MXN',
      address: { '@type': 'PostalAddress', addressLocality: SITE.city, addressRegion: SITE.region, addressCountry: SITE.country },
      geo: { '@type': 'GeoCoordinates', latitude: SITE.geo.lat, longitude: SITE.geo.lng },
      areaServed: [
        { '@type': 'City', name: 'Cabo San Lucas' },
        { '@type': 'City', name: 'San José del Cabo' }
      ],
      openingHoursSpecification: SITE.openingHours.map((o) => ({
        '@type': 'OpeningHoursSpecification', dayOfWeek: o.days, opens: o.opens, closes: o.closes
      })),
      sameAs: [SITE.social.facebook, SITE.social.instagram]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': absHome(lang) + '#website',
      url: absHome(lang),
      name: SITE.name,
      inLanguage: t.locale,
      publisher: { '@id': SITE.url + '/#org' }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: t.tours.title,
      numberOfItems: TOURS.length,
      itemListElement: TOURS.map((x, i) => ({
        '@type': 'ListItem', position: i + 1, url: absTour(lang, x), name: x.title[lang]
      }))
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: t.faq.items.map((f) => ({
        '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    }
  ];

  const combos = TOURS.filter((x) => (x.tags || []).includes('combo'));

  const body = `${header(lang, d, homeUrl(lang === 'es' ? 'en' : 'es', d))}
<main id="main">

  <section class="hero">
    <div class="wrap hero-in">
      <div>
        <p class="eyebrow">${esc(t.hero.eyebrow)}</p>
        <h1 class="h1">${esc(t.hero.title)}</h1>
        <p class="hero-lead">${esc(t.hero.lead)}</p>
        <div class="hero-actions">
          <a class="btn" href="#tours">${esc(t.hero.ctaPrimary)}${ICON.arrow}</a>
          <a class="btn btn--ghost" href="${wa(t.contact.waMessage)}" target="_blank" rel="noopener">${ICON.wa}${esc(t.hero.ctaSecondary)}</a>
        </div>
        <p class="hero-note">${ICON.shield}${esc(t.hero.note)}</p>
        <div class="hero-stats">
          <div><b>14</b><span>${esc(t.hero.stat1)}</span></div>
          <div><b>$25</b><span>${esc(t.hero.stat2)}</span></div>
          <div><b>7/7</b><span>${esc(t.hero.stat3)}</span></div>
        </div>
      </div>
      <div class="hero-art">
        <figure><img src="${asset('img/hero-arch.webp', d)}" width="900" height="1150" alt="${attr(lang === 'es' ? 'El Arco de Cabo San Lucas al atardecer visto desde el mar' : 'El Arco in Cabo San Lucas at sunset, seen from the water')}" fetchpriority="high" decoding="async"></figure>
        <figure><img src="${asset('img/hero-camel.webp', d)}" width="760" height="560" alt="${attr(lang === 'es' ? 'Paseo en camello al atardecer frente al Pacífico' : 'Camel ride at sunset on the Pacific shore')}" loading="lazy" decoding="async"></figure>
        <figure><img src="${asset('img/hero-fish.webp', d)}" width="760" height="560" alt="${attr(lang === 'es' ? 'Peces tropicales vistos desde el barco de casco transparente' : 'Tropical fish seen through the clear-hull boat')}" loading="lazy" decoding="async"></figure>
      </div>
    </div>
  </section>

  <section class="section section--tight trust">
    <div class="wrap">
      <h2 class="h3" style="margin-bottom:2rem">${esc(t.trust.title)}</h2>
      <div class="trust-grid">
        ${[['users', t.trust.a], ['pin', t.trust.b], ['tag', t.trust.c], ['leaf', t.trust.d]]
          .map(([ic, o]) => `<div class="trust-item reveal"><span class="ico">${ICON[ic]}</span><b>${esc(o.t)}</b><p>${esc(o.d)}</p></div>`)
          .join('')}
      </div>
    </div>
  </section>

  <section class="section" id="tours">
    <div class="wrap">
      <div class="sec-head">
        <p class="eyebrow">${esc(t.tours.eyebrow)}</p>
        <h2 class="h2">${esc(t.tours.title)}</h2>
        <p class="lead">${esc(t.tours.lead)}</p>
      </div>

      <div class="tools">
        <div class="chips" role="group" aria-label="${attr(t.tours.filterLabel)}">
          ${cats.map((c, i) => `<button class="chip" type="button" data-cat="${c}" aria-pressed="${i === 0}">${esc(t.cat[c])}<span class="n">${counts[c]}</span></button>`).join('')}
        </div>
        <div class="sortbox">
          <label for="tour-sort">${esc(t.tours.sortLabel)}</label>
          <select class="select" id="tour-sort">
            ${Object.entries(t.tours.sort).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}
          </select>
        </div>
      </div>
      <p class="result-count" id="tour-count" data-one="${attr(t.tours.countOne)}" data-many="${attr(t.tours.count)}" aria-live="polite">${TOURS.length} ${esc(t.tours.count)}</p>

      <div class="grid-tours" id="tour-grid">
        ${TOURS.map((x, i) => tourCard(lang, x, d, i)).join('\n')}
        <p class="empty-state" id="tour-empty" hidden>${esc(t.tours.empty)}</p>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="wrap">
      <div class="band reveal">
        <img src="${asset('img/band-combo.webp', d)}" width="1800" height="1200" loading="lazy" decoding="async" alt="${attr(lang === 'es' ? 'Cuatrimotos en las dunas de Migriño' : 'ATVs on the Migriño dunes')}">
        <div class="band-in">
          <p class="eyebrow">${esc(t.combo.eyebrow)}</p>
          <h2 class="h2">${esc(t.combo.title)}</h2>
          <p class="lead">${esc(t.combo.lead)}</p>
          <div class="hero-actions" style="margin-top:1.75rem">
            ${combos.map((c) => `<a class="btn btn--ghost" href="${tourUrl(lang, c, d)}">${esc(c.title[lang])}</a>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--deep" id="how">
    <div class="wrap">
      <div class="sec-head">
        <p class="eyebrow">${esc(t.how.eyebrow)}</p>
        <h2 class="h2">${esc(t.how.title)}</h2>
        <p class="lead">${esc(t.how.lead)}</p>
      </div>
      <div class="steps">
        ${[t.how.s1, t.how.s2, t.how.s3].map((s) => `<div class="step reveal"><b>${esc(s.t)}</b><p>${esc(s.d)}</p></div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section" id="why">
    <div class="wrap split split--wide">
      <div>
        <p class="eyebrow">${esc(t.why.eyebrow)}</p>
        <h2 class="h2" style="margin-top:.8rem">${esc(t.why.title)}</h2>
        <div class="prose">
          <p>${esc(t.why.p1)}</p>
          <p>${esc(t.why.p2)}</p>
          <p>${esc(t.why.p3)}</p>
        </div>
        <ul class="why-list">
          ${[t.why.b1, t.why.b2, t.why.b3, t.why.b4].map((b) => `<li>${ICON.check}<span>${esc(b)}</span></li>`).join('')}
        </ul>
      </div>
      <div class="split-media reveal">
        <img src="${asset('img/band-desert.webp', d)}" width="1800" height="1440" loading="lazy" decoding="async" alt="${attr(lang === 'es' ? 'Guía y viajeros en una salida de cuatrimotos en Los Cabos' : 'Guide and travellers on an ATV departure in Los Cabos')}">
      </div>
    </div>
  </section>

  <section class="section section--sand">
    <div class="wrap">
      <div class="sec-head">
        <p class="eyebrow">${esc(t.reviews.eyebrow)}</p>
        <h2 class="h2">${esc(t.reviews.title)}</h2>
        <p class="lead">${esc(t.reviews.lead)}</p>
      </div>
      <!-- Reseñas tomadas del sitio anterior. Sustitúyelas por reseñas reales y
           atribuidas (Google / TripAdvisor) antes de añadir marcado aggregateRating. -->
      <div class="reviews-rail" tabindex="0" role="group" aria-label="${attr(t.reviews.title)}">
        ${t.reviews.items.map((r) => `<figure class="review"><div class="stars">${ICON.star.repeat(5)}</div><blockquote><p>${esc(r)}</p></blockquote><figcaption><cite>${esc(t.reviews.author)}</cite></figcaption></figure>`).join('')}
      </div>
      <a class="btn btn--ghost" href="${SITE.social.facebook}" target="_blank" rel="noopener" style="margin-top:1.5rem">${ICON.fb}${esc(t.reviews.cta)}</a>
    </div>
  </section>

  <section class="section" id="faq">
    <div class="wrap">
      <div class="sec-head">
        <p class="eyebrow">${esc(t.faq.eyebrow)}</p>
        <h2 class="h2">${esc(t.faq.title)}</h2>
      </div>
      <div class="faq-list">
        ${t.faq.items.map((f) => `<details class="faq-item"><summary>${esc(f.q)}</summary><div class="answer">${esc(f.a)}</div></details>`).join('')}
      </div>
    </div>
  </section>

  <section class="section section--sand" id="contact">
    <div class="wrap contact-grid">
      <div>
        <p class="eyebrow">${esc(t.contact.eyebrow)}</p>
        <h2 class="h2" style="margin-top:.8rem">${esc(t.contact.title)}</h2>
        <p class="lead" style="margin-top:1rem">${esc(t.contact.lead)}</p>
        <div class="contact-actions" style="margin-top:1.75rem">
          <a class="btn btn--wa" href="${wa(t.contact.waMessage)}" target="_blank" rel="noopener">${ICON.wa}${esc(t.contact.whatsapp)}</a>
          <a class="btn btn--ghost" href="tel:${SITE.phoneHref}">${ICON.phone}${esc(t.contact.call)}</a>
        </div>
      </div>
      <div class="contact-card">
        <dl class="contact-rows">
          ${[
            [ICON.phone, t.contact.phoneLabel, `<a href="tel:${SITE.phoneHref}">${esc(SITE.phoneDisplay)}</a>`],
            [ICON.mail, t.contact.emailLabel, `<a href="mailto:${SITE.email}">${esc(SITE.email)}</a>`],
            [ICON.clock, t.contact.hoursLabel, esc(t.contact.hoursValue)],
            [ICON.pin, t.contact.areaLabel, esc(t.contact.areaValue)]
          ].map(([ic, label, val]) =>
            `<div class="contact-row"><dt><span class="ico">${ic}</span>${esc(label)}</dt><dd>${val}</dd></div>`
          ).join('\n          ')}
        </dl>
        <div class="socials">
          <a href="${SITE.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.fb}</a>
          <a href="${SITE.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.ig}</a>
        </div>
      </div>
    </div>
  </section>

</main>
${footer(lang, d)}
${floats(lang, d, '#tours', t.hero.ctaPrimary)}`;

  return page({
    lang, d,
    title: t.meta.homeTitle,
    desc: t.meta.homeDesc,
    canonical: absHome(lang),
    alt: { es: absHome('es'), en: absHome('en') },
    ogImage: SITE.url + '/assets/img/og.jpg',
    ld, body
  });
}

/* ---------------------------------------------------------- tour page -- */
function tourPage(lang, x) {
  const t = I18N[lang];
  const d = lang === 'en' ? 3 : 2;
  const gallery = Array.from({ length: x.gallery }, (_, i) => `${x.img}-${i + 1}`);
  const related = TOURS.filter((o) => o.id !== x.id && (o.category === x.category || (o.tags || []).some((g) => (x.tags || []).includes(g)))).slice(0, 3);
  const rel3 = related.length ? related : TOURS.filter((o) => o.id !== x.id).slice(0, 3);
  const save = x.price.adultList - x.price.adult;
  const desc = clean(`${t.meta.tourDescPrefix} ${money(x.price.adult)} USD ${x.summary[lang]} ${t.meta.tourDescSuffix}`).slice(0, 300);

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: x.title[lang],
      description: clean(x.description[lang].join(' ')),
      url: absTour(lang, x),
      image: gallery.slice(0, 4).map((g) => `${SITE.url}/assets/img/tours/${g}.webp`),
      inLanguage: t.locale,
      touristType: lang === 'es' ? ['Familias', 'Parejas', 'Grupos de amigos'] : ['Families', 'Couples', 'Groups of friends'],
      provider: { '@type': 'TravelAgency', '@id': SITE.url + '/#org', name: SITE.name, url: SITE.url + '/' },
      itinerary: {
        '@type': 'ItemList',
        itemListElement: x.highlights[lang].map((h, i) => ({ '@type': 'ListItem', position: i + 1, name: h }))
      },
      offers: {
        '@type': 'Offer',
        price: x.price.adult,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: absTour(lang, x),
        validFrom: BUILT,
        seller: { '@id': SITE.url + '/#org' }
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t.tour.home, item: absHome(lang) },
        { '@type': 'ListItem', position: 2, name: t.tour.back, item: absHome(lang) + '#tours' },
        { '@type': 'ListItem', position: 3, name: x.title[lang] }
      ]
    }
  ];

  const labels = {
    intro: t.tour.waIntro, tour: t.tour.waTour, date: t.tour.waDate, time: t.tour.waTime,
    pax: t.tour.waPax, total: t.tour.waTotal, close: t.tour.waClose,
    adults: t.tour.waAdults, adult: t.tour.waAdult,
    kids: t.tour.waKids, kid: t.tour.waKid
  };

  const body = `${header(lang, d, tourUrl(lang === 'es' ? 'en' : 'es', x, d))}
<main id="main">

  <section class="tour-top">
    <div class="wrap tour-top-in">
      <nav class="crumbs" aria-label="breadcrumb">
        <ol>
          <li><a href="${homeUrl(lang, d)}">${esc(t.tour.home)}</a></li>
          <li><a href="${homeUrl(lang, d)}#tours">${esc(t.tour.back)}</a></li>
          <li aria-current="page">${esc(x.title[lang])}</li>
        </ol>
      </nav>
      <h1 class="h1">${esc(x.title[lang])}</h1>
      <p class="tagline">${esc(x.tagline[lang])}</p>
      <div class="tour-facts">
        <span class="fact">${ICON.clock}${x.hours} ${esc(t.tours.hours)}</span>
        <span class="fact">${ICON.users}${esc(t.tour.languageValue)}</span>
        <span class="fact">${ICON.tag}${esc(t.cat[x.category])}</span>
        <span class="fact">${ICON.cal}${x.times.length ? `${x.times.length} ${esc(t.tour.departuresShort)} · ${x.times[0]}–${x.times[x.times.length - 1]}` : esc(t.tour.departuresOnRequest)}</span>
      </div>
    </div>
  </section>

  <div class="wrap">
    <div class="gallery" aria-label="${attr(t.tour.gallery)}">
      ${gallery.map((g, i) => {
        const hidden = gallery.length - 5;
        const moreLabel = hidden === 1 ? t.tour.morePhoto : t.tour.morePhotos.replace('{n}', String(hidden));
        const more = i === 4 && hidden > 0 ? `<span class="more">${esc(moreLabel)}</span>` : '';
        return `<button type="button" data-full="${asset(`img/tours/${g}.webp`, d)}" aria-label="${attr(t.tour.openGallery)} ${i + 1}">
        <img src="${asset(`img/tours/${g}${i === 0 ? '' : 't'}.webp`, d)}" ${i === 0 ? 'width="1400" height="933" fetchpriority="high"' : 'width="320" height="240" loading="lazy"'} decoding="async" alt="${attr(x.title[lang])} — ${i + 1}">${more}
      </button>`;
      }).join('\n      ')}
    </div>
  </div>

  <section class="section">
    <div class="wrap tour-layout">
      <div class="tour-body">

        <section>
          <h2>${esc(t.tour.about)}</h2>
          <div class="prose">${x.description[lang].map((p) => `<p>${esc(p)}</p>`).join('')}</div>
        </section>

        <section>
          <h2>${esc(t.tour.highlights)}</h2>
          <div class="hl-grid">
            ${x.highlights[lang].map((h) => `<div class="hl">${ICON.spark}<span>${esc(h)}</span></div>`).join('')}
          </div>
        </section>

        <section>
          <div class="inc-grid">
            <div class="inc inc--yes">
              <h3>${ICON.check}${esc(t.tour.includes)}</h3>
              <ul>${x.includes[lang].map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
            </div>
            <div class="inc inc--no">
              <h3>${ICON.close}${esc(t.tour.excludes)}</h3>
              <ul>${x.excludes[lang].map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
            </div>
          </div>
        </section>

        <section>
          <div class="notice">
            <h3>${ICON.alert}${esc(t.tour.restrictions)}</h3>
            <ul>${x.restrictions[lang].map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
          </div>
        </section>

        <section>
          <h2>${esc(t.tour.meeting)}</h2>
          <div class="prose"><p>${esc(x.meeting[lang])}</p></div>
        </section>

      </div>

      <aside class="booking" aria-label="${attr(t.tour.bookTitle)}">
        <div class="booking-head">
          <div class="booking-price">
            <span class="now">${money(x.price.adult)}</span>
            ${save > 0 ? `<span class="was">${money(x.price.adultList)}</span>` : ''}
            <span class="unit">USD · ${esc(t.tour.priceAdult)}</span>
          </div>
          ${save > 0 ? `<span class="save-pill">${ICON.tag}${esc(t.tour.save)} ${money(save)} USD</span>` : ''}
          <p class="kid-price">${esc(t.tour.priceKid)}: <strong>${money(x.price.kid)} USD</strong></p>
        </div>

        <form class="booking-form" id="booking-form"
              data-wa="${SITE.whatsapp}"
              data-tour="${attr(x.title[lang])}"
              data-adult="${x.price.adult}"
              data-kid="${x.price.kid}"
              data-locale="${t.locale}"
              data-labels='${JSON.stringify(labels).replace(/'/g, '&#39;')}'>
          <div class="field">
            <label for="f-date">${esc(t.tour.date)}</label>
            <input type="date" id="f-date" name="date" required>
          </div>
          ${x.times.length ? `<div class="field">
            <label for="f-time">${esc(t.tour.time)}</label>
            <select id="f-time" name="time" class="select" style="width:100%;border-radius:var(--r-sm)">
              ${x.times.map((h, i) => `<option${i === 0 ? ' selected' : ''}>${h}</option>`).join('')}
            </select>
          </div>` : ''}
          <div class="field-row">
            <div class="field">
              <label for="f-adults">${esc(t.tour.adults)}</label>
              <div class="stepper">
                <button type="button" data-for="f-adults" data-step="-1" aria-label="−">−</button>
                <input type="number" id="f-adults" name="adults" value="2" min="1" max="30" inputmode="numeric">
                <button type="button" data-for="f-adults" data-step="1" aria-label="+">+</button>
              </div>
            </div>
            <div class="field">
              <label for="f-kids">${esc(t.tour.kids)}</label>
              <div class="stepper">
                <button type="button" data-for="f-kids" data-step="-1" aria-label="−">−</button>
                <input type="number" id="f-kids" name="kids" value="0" min="0" max="30" inputmode="numeric">
                <button type="button" data-for="f-kids" data-step="1" aria-label="+">+</button>
              </div>
            </div>
          </div>
          <div class="total-row">
            <span>${esc(t.tour.total)}</span>
            <b id="f-total">${money(x.price.adult * 2)} USD</b>
          </div>
          <p class="total-note">${esc(t.tour.totalNote)}</p>
          <button class="btn btn--wa btn--block" type="submit">${ICON.wa}${esc(t.tour.submit)}</button>
        </form>

        <div class="booking-foot">
          <p class="reassure">${ICON.check}${esc(t.tour.bookLead)}</p>
        </div>
      </aside>
    </div>
  </section>

  <section class="section section--sand section--tight">
    <div class="wrap">
      <h2 class="h3">${esc(t.tour.related)}</h2>
      <div class="related-grid">
        ${rel3.map((o, i) => tourCard(lang, o, d, i)).join('\n')}
      </div>
    </div>
  </section>

</main>

<dialog class="lightbox" id="lightbox" aria-label="${attr(t.tour.gallery)}">
  <div class="lightbox-in">
    <img class="lb-img" src="" alt="">
    <button class="lb-btn lb-close" type="button" aria-label="${attr(t.nav.close)}">${ICON.close}</button>
    <button class="lb-btn lb-prev" type="button" aria-label="${attr(t.tour.prev)}">${ICON.chevL}</button>
    <button class="lb-btn lb-next" type="button" aria-label="${attr(t.tour.next)}">${ICON.chevR}</button>
    <p class="lb-count"></p>
  </div>
</dialog>

${footer(lang, d)}
${floats(lang, d, '#booking-form', t.tour.book)}`;

  return page({
    lang, d,
    title: `${x.title[lang]} | ${money(x.price.adult)} USD — ${SITE.name}`,
    desc,
    canonical: absTour(lang, x),
    alt: { es: absTour('es', x), en: absTour('en', x) },
    ogImage: `${SITE.url}/assets/img/tours/${x.img}-card.webp`,
    ld, body
  });
}

/* ------------------------------------------------------------ 404 page -- */
function notFoundPage() {
  const lang = 'es';
  const t = I18N[lang];
  const d = 0;
  const body = `${header(lang, d, homeUrl('en', d))}
<main id="main" class="wrap error-page">
  <div>
    <p class="error-code">404</p>
    <h1 class="h1">${esc(t.notFound.title)} · ${esc(I18N.en.notFound.title)}</h1>
    <p class="lead" style="margin:1.25rem auto 2rem">${esc(t.notFound.lead)}<br>${esc(I18N.en.notFound.lead)}</p>
    <a class="btn" href="/">${esc(t.notFound.cta)}${ICON.arrow}</a>
  </div>
</main>
${footer(lang, d)}`;
  return page({
    lang, d, title: `404 — ${SITE.name}`, desc: t.notFound.lead,
    canonical: SITE.url + '/404.html',
    alt: { es: absHome('es'), en: absHome('en') },
    ogImage: SITE.url + '/assets/img/og.jpg', ld: [], body
  });
}

/* -------------------------------------------------------------- output -- */
function write(rel, content) {
  const full = join(ROOT, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  return rel;
}

const written = [];
for (const lang of LANGS) {
  written.push(write(lang === 'en' ? 'en/index.html' : 'index.html', homePage(lang)));
  for (const x of TOURS) {
    written.push(write(`${lang === 'en' ? 'en/tours' : 'tours'}/${x.slug[lang]}/index.html`, tourPage(lang, x)));
  }
}
written.push(write('404.html', notFoundPage()));

/* sitemap */
const urls = [
  { loc: absHome('es'), pr: '1.0', cf: 'weekly' },
  { loc: absHome('en'), pr: '1.0', cf: 'weekly' },
  ...TOURS.flatMap((x) => LANGS.map((l) => ({ loc: absTour(l, x), pr: '0.8', cf: 'monthly', tour: x })))
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">` +
  '\n' + urls.map((u) => {
    const alts = u.tour
      ? LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${absTour(l, u.tour)}"/>`).join('\n')
      : LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${absHome(l)}"/>`).join('\n');
    return `  <url>
    <loc>${u.loc}</loc>
${alts}
    <lastmod>${BUILT}</lastmod>
    <changefreq>${u.cf}</changefreq>
    <priority>${u.pr}</priority>
  </url>`;
  }).join('\n') + '\n</urlset>\n';
written.push(write('sitemap.xml', sitemap));

written.push(write('robots.txt', `User-agent: *
Allow: /

Sitemap: ${SITE.url}/sitemap.xml
`));

written.push(write('site.webmanifest', JSON.stringify({
  name: SITE.name,
  short_name: 'Best Cabo',
  description: I18N.es.meta.homeDesc,
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#071a24',
  icons: [{ src: '/assets/img/logo.webp', sizes: '360x321', type: 'image/webp' }]
}, null, 2)));

console.log(`Built ${written.length} files:`);
console.log('  ' + written.slice(0, 4).join('\n  ') + `\n  … +${written.length - 4} more`);
