# Best Cabo Adventures — sitio nuevo

Rediseño y reconstrucción completa del sitio de [bestcaboadventures.com](https://www.bestcaboadventures.com/):
sitio estático bilingüe (ES/EN), sin frameworks, sin dependencias en tiempo de ejecución y
generado desde archivos de datos editables.

**31 páginas**: portada ES + EN, 14 fichas de tour × 2 idiomas, 404, más `sitemap.xml`,
`robots.txt` y `site.webmanifest`.

---

## Qué estaba mal en el sitio anterior

Auditoría hecha sobre el sitio en producción. Todo lo de abajo está corregido en esta versión.

### Técnico / SEO

| Problema | Detalle | Cómo se resolvió |
|---|---|---|
| **Bucle de redirección** | `/` responde `302 → /` con `Set-Cookie: lang=en`. Un cliente sin cookies (incluidos crawlers) queda en un bucle infinito. | Sitio 100 % estático: cada URL responde `200` sin cookies ni redirecciones. |
| **`lang="zxx"`** | Ese código significa literalmente "sin contenido lingüístico". Rompe SEO y lectores de pantalla. | `lang="es"` / `lang="en"` reales por página. |
| **Sin meta description** | Ninguna página la tenía. | Descripción única y escrita a mano en cada una de las 31 páginas. |
| **Sin Open Graph ni Twitter Card** | Al compartir el link no aparecía imagen ni título. | OG + Twitter completos, con imagen social 1200×630 generada. |
| **Sin datos estructurados** | Cero JSON-LD. | `TravelAgency`, `WebSite`, `ItemList`, `FAQPage` en portada; `TouristTrip` + `Offer` + `BreadcrumbList` en cada tour. |
| **Sin canonical, sitemap ni robots** | — | `canonical` + `hreflang` (es / en / x-default) en todas, `sitemap.xml` con alternates y `robots.txt`. |
| **`<title>` genérico** | Literalmente `Best Cabo Adventures` en todo el sitio. | Títulos únicos con tour, precio y marca. |
| **Peso innecesario** | Bootstrap + jQuery + plugins + `plugin.css` para una landing estática. | 0 dependencias. Un CSS (~26 KB) y un JS (~5 KB), ambos sin librerías. |
| **Imágenes sin optimizar** | JPEG originales de hasta 1.4 MB y 4464 px de ancho servidos tal cual. | Todo a WebP redimensionado, con `srcset`, `width`/`height`, `loading="lazy"` y `decoding="async"`. |

### Contenido

| Problema | Cómo se resolvió |
|---|---|
| **Bilingüe roto**: con `?lang=en` la mitad de la página seguía en español (testimonios, "Por qué elegirnos", el bloque de transporte). | Dos árboles de URLs completos y separados, cada uno íntegramente en su idioma, enlazados con `hreflang`. |
| **Enlaces muertos**: `tour-grid.html`, `tour-single.html`, `about.html`, `href="#"` en "Book now!" y `href=""` en el footer. | Sin enlaces rotos: los 1 238 enlaces internos verificados por crawler automatizado. |
| **Precios confusos**: `$78.00 $88.00` sin explicar cuál es cuál ni en qué moneda. | Precio vigente destacado, precio de lista tachado, moneda explícita y tarifa de menor visible. |
| **Descripciones truncadas** con `...` en todas las tarjetas. | Resumen propio en cada tarjeta y descripción completa en la ficha. |
| **Testimonios duplicados**: dos idénticos palabra por palabra. | Deduplicados a 4 distintos (ver *Pendientes*). |
| **Galería de Instagram falsa**: 9 imágenes placeholder del template (`ins-1.jpg`…`ins-9.jpg`). | Eliminada; en su lugar, enlaces reales a Facebook e Instagram. |
| **Sin información de compra**: ni política de pago, ni punto de encuentro, ni cuotas extra, ni restricciones visibles antes de reservar. | Cada ficha declara qué incluye, qué no, restricciones de edad/peso, punto de encuentro y las cuotas que se pagan en sitio. |
| **Erratas en el texto en inglés**: `dessert` (por *desert*), `Wales` (por *whales*), `Minimun`, `trough`, `exquisit`, `pur menu`, `havePico`, `rapel`, `Gigant`. | Copy en inglés reescrito y corregido; versión en español escrita desde cero. |
| **Copyright 2023** | Año dinámico. |
| **`tel:` sin código de país** | `tel:+526143020978`. |

### UX

- Reserva real: fecha, horario, adultos y menores → **total estimado en vivo** → mensaje de
  WhatsApp prellenado con todos los datos. Antes, "Book now!" apuntaba a `#`.
- Filtros por categoría y ordenamiento por precio y duración, sin recargar.
- Barra inferior fija en móvil con acceso permanente a WhatsApp.
- Galería con lightbox navegable por teclado (← → Esc).
- Acordeón de preguntas frecuentes con `<details>` nativo (funciona sin JS).

### Accesibilidad

Auditado con **axe-core** (WCAG 2.1 A + AA): **0 violaciones** en portada ES, portada EN,
ficha de tour y móvil 390 px.

- Paleta ajustada para cumplir 4.5:1 en todo el texto (el naranja de marca pasó a llevar texto
  oscuro: 6.2:1; el verde de WhatsApp se oscureció a 5.0:1).
- Enlace "saltar al contenido", `focus-visible` visible en todo elemento interactivo,
  `alt` en todas las imágenes, un solo `<h1>` por página, sin IDs duplicados.
- `prefers-reduced-motion` respetado.
- Las animaciones de entrada solo se aplican si hay JS (`.js .reveal`): sin JavaScript el
  contenido se ve completo, no en blanco.

---

## Estructura

```
data/                 ← lo único que hay que editar para cambiar contenido
  tours.json            los 14 tours, con textos ES/EN, precios, horarios, incluye/no incluye
  i18n.json             todos los textos de interfaz en ES y EN
  site.json             teléfono, WhatsApp, correo, redes, horario, geolocalización
assets/
  css/styles.css        sistema de diseño completo (tokens, componentes)
  js/app.js             filtros, orden, lightbox, formulario de reserva. Todo opcional
  img/                  imágenes optimizadas en WebP + imagen social og.jpg
  favicon.svg
build.mjs             generador estático (Node, sin dependencias)

# generado por el build — no editar a mano:
index.html  en/index.html  tours/*/index.html  en/tours/*/index.html
404.html  sitemap.xml  robots.txt  site.webmanifest
```

## Cómo trabajar con el sitio

```bash
node build.mjs                              # regenera las 31 páginas
python3 -m http.server 8000                 # previsualizar en http://localhost:8000
```

**Para cambiar un precio, un horario o un texto de tour** → edita `data/tours.json` y
vuelve a correr `node build.mjs`. No toques los `.html`: se sobrescriben.

**Para cambiar textos de interfaz** (botones, títulos de sección, preguntas frecuentes) →
`data/i18n.json`.

**Para cambiar teléfono, WhatsApp, correo u horario** → `data/site.json`. El número de
WhatsApp alimenta todos los botones del sitio desde un solo lugar.

**Para añadir un tour**: agrega un objeto a `data/tours.json` (copia uno existente como
plantilla), coloca las imágenes como `assets/img/tours/<img>-card.webp`,
`<img>-card-sm.webp`, `<img>-1.webp`, `<img>-1t.webp`… y ajusta el campo `gallery` con el
número de fotos.

## Despliegue

**En línea ahora:** https://a16vhoss.github.io/P-gina-Sergio-/

El deploy es automático. `.github/workflows/deploy.yml` se dispara en cada push a
`claude/webpage-analysis-improvement-cxo5bo`: instala Node, corre `node build.mjs`,
verifica que se hayan generado las 30 páginas y publica el resultado en la rama
`gh-pages`, que es la que sirve GitHub Pages.

Es decir: **para actualizar el sitio basta con editar `data/*.json` y hacer push.** No hay
que construir a mano ni subir archivos.

> El workflow publica empujando a `gh-pages` en vez de usar `actions/deploy-pages` porque
> la API de Pages exige permisos de administración del repositorio que `GITHUB_TOKEN` no
> tiene. Empujar a una rama solo necesita `contents: write`, así que el workflow es
> autosuficiente y no depende de ningún ajuste manual.

### Para ponerlo en bestcaboadventures.com

Es HTML estático, así que sirve en cualquier hosting (el Apache actual, Netlify, Vercel,
nginx). Los enlaces internos son relativos, así que funciona igual en la raíz del dominio
que en un subdirectorio.

1. En `data/site.json` deja `url` apuntando al dominio final (ya está en
   `https://www.bestcaboadventures.com`). Ese valor alimenta canonicals, hreflang, sitemap
   y JSON-LD.
2. Corre `node build.mjs`.
3. Sube al `DocumentRoot` del servidor: `index.html`, `404.html`, `robots.txt`,
   `sitemap.xml`, `site.webmanifest`, y las carpetas `assets/`, `en/` y `tours/`.
4. Retira la redirección con cookie que hoy tiene la raíz del sitio: es lo que provoca el
   bucle infinito para clientes sin cookies.

Mientras el sitio viva en `github.io`, los `canonical` de cada página siguen apuntando al
dominio de producción, así que Google no indexa la copia como contenido duplicado.

---

## Pendientes para Sergio

Cosas que **no** se inventaron porque requieren información que solo tiene el negocio:

1. **Reseñas.** Las 4 que aparecen son las del sitio anterior, deduplicadas y sin atribución
   inventada. Conviene reemplazarlas por reseñas reales y atribuidas (Google / TripAdvisor).
   Hasta entonces **no** se agregó marcado `aggregateRating`: publicar una calificación falsa
   es motivo de penalización manual de Google.
2. **Política de cancelación.** No existe en ningún lado del sitio actual. Es de las primeras
   cosas que pregunta un turista antes de reservar. Cuando la definas, va como una pregunta
   más en `data/i18n.json` → `faq.items`.
3. **Teléfono.** El número publicado (614) es lada de Chihuahua, no de Los Cabos (624).
   Si es correcto, perfecto; si hay un número local, conviene mostrarlo.
4. **Dirección fiscal / oficina.** El sitio anterior solo decía "Los Cabos, B.C.S.". Con una
   dirección real se puede añadir `PostalAddress` completo y un mapa, lo que ayuda al SEO local.
5. **Horarios del taller de cerámica** (tour id 19): el sitio anterior no tiene ninguno cargado.
   Hoy se muestra como "bajo solicitud".
6. **Fotos propias del combo ATV + cabalgata y del taller de cerámica**: las disponibles son
   pocas y algunas traen marca de agua promocional.
