import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ReportView } from '@openfons/contracts';
import { buildDirectApiVsOpenRouterReportView } from './static-html.js';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderList = (items: string[]): string =>
  items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

const renderClaimCards = (reportView: ReportView): string =>
  reportView.report.claims
    .slice(0, 3)
    .map(
      (claim) => `
        <article class="claim-card reveal">
          <p class="card-kicker">Claim</p>
          <h3>${escapeHtml(claim.label)}</h3>
          <p>${escapeHtml(claim.statement)}</p>
        </article>
      `
    )
    .join('');

const renderSourceCards = (reportView: ReportView): string =>
  reportView.report.sourceIndex
    .filter((source) => source.sourceKind === 'official')
    .slice(0, 4)
    .map(
      (source) => `
        <article class="source-card reveal">
          <p class="card-kicker">Official</p>
          <h3>${escapeHtml(source.title)}</h3>
          <p class="source-url">${escapeHtml(source.url)}</p>
          <p class="source-meta">
            ${escapeHtml(source.useAs)} / ${escapeHtml(source.reportability)} / ${escapeHtml(source.riskLevel)}
          </p>
        </article>
      `
    )
    .join('');

const renderDeckHtml = (reportView: ReportView): string => {
  const { report } = reportView;
  const communitySource = report.sourceIndex.find(
    (source) => source.sourceKind === 'community'
  );
  const lastUpdate =
    report.updateLog[report.updateLog.length - 1] ?? {
      at: report.updatedAt,
      note: 'Deck generated from the latest report export.'
    };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(report.title)} Deck</title>
    <meta name="description" content="${escapeHtml(report.summary)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;700&family=Manrope:wght@400;500;700&display=swap" rel="stylesheet" />
    <style>
      :root {
        color-scheme: dark;
        --bg: #0f1116;
        --bg-soft: #161a22;
        --panel: rgba(18, 24, 33, 0.82);
        --panel-strong: rgba(26, 34, 46, 0.92);
        --line: rgba(224, 179, 119, 0.18);
        --ink: #f5efe6;
        --muted: #c5b7a3;
        --accent: #f0b374;
        --accent-strong: #ffcf9c;
        --accent-soft: rgba(240, 179, 116, 0.14);
        --glow: rgba(240, 179, 116, 0.22);
        --shadow: 0 28px 60px rgba(0, 0, 0, 0.32);
        --title-size: clamp(2.3rem, 6vw, 5.8rem);
        --h2-size: clamp(1.4rem, 3vw, 2.5rem);
        --h3-size: clamp(1rem, 2vw, 1.35rem);
        --body-size: clamp(0.9rem, 1.2vw, 1.08rem);
        --small-size: clamp(0.72rem, 0.92vw, 0.88rem);
        --slide-padding: clamp(24px, 5vw, 56px);
        --card-gap: clamp(14px, 1.6vw, 22px);
        --radius: 28px;
        --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        height: 100%;
        overflow-x: hidden;
        background:
          radial-gradient(circle at top left, rgba(240, 179, 116, 0.18), transparent 26%),
          radial-gradient(circle at bottom right, rgba(102, 77, 55, 0.24), transparent 24%),
          var(--bg);
        color: var(--ink);
        font-family: "Manrope", sans-serif;
        scroll-snap-type: y mandatory;
        scroll-behavior: smooth;
      }

      body::before,
      body::after {
        content: "";
        position: fixed;
        inset: auto;
        pointer-events: none;
        z-index: 0;
        filter: blur(18px);
      }

      body::before {
        top: 7vh;
        left: 4vw;
        width: min(36vw, 340px);
        height: min(36vw, 340px);
        border-radius: 50%;
        background: rgba(240, 179, 116, 0.12);
      }

      body::after {
        right: 6vw;
        bottom: 8vh;
        width: min(22vw, 220px);
        height: min(22vw, 220px);
        border-radius: 36px;
        background: rgba(108, 77, 49, 0.2);
        transform: rotate(18deg);
      }

      h1,
      h2,
      h3,
      p,
      ul {
        margin: 0;
      }

      a {
        color: inherit;
      }

      .progress {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        z-index: 30;
        background: rgba(255, 255, 255, 0.06);
      }

      .progress-bar {
        height: 100%;
        width: 0;
        background: linear-gradient(90deg, var(--accent), var(--accent-strong));
        box-shadow: 0 0 24px var(--glow);
        transition: width 220ms var(--ease);
      }

      .slide-nav {
        position: fixed;
        right: clamp(12px, 1.8vw, 24px);
        bottom: clamp(12px, 1.8vw, 24px);
        z-index: 30;
        display: flex;
        gap: 10px;
      }

      .nav-button,
      .dot {
        border: 1px solid var(--line);
        background: rgba(13, 17, 24, 0.88);
        color: var(--ink);
      }

      .nav-button {
        padding: 10px 14px;
        border-radius: 999px;
        cursor: pointer;
        font: inherit;
        font-size: var(--small-size);
      }

      .dots {
        position: fixed;
        top: 50%;
        right: clamp(10px, 1.4vw, 18px);
        z-index: 30;
        display: grid;
        gap: 10px;
        transform: translateY(-50%);
      }

      .dot {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        padding: 0;
        cursor: pointer;
        transition: transform 180ms var(--ease), background 180ms var(--ease);
      }

      .dot.active {
        background: var(--accent);
        transform: scale(1.18);
      }

      .deck {
        position: relative;
        z-index: 1;
      }

      .slide {
        position: relative;
        min-height: 100vh;
        min-height: 100dvh;
        padding: var(--slide-padding);
        overflow: hidden;
        scroll-snap-align: start;
        display: flex;
        align-items: center;
      }

      .slide-frame {
        width: min(1180px, 100%);
        margin: 0 auto;
        padding: clamp(22px, 3.4vw, 40px);
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background:
          linear-gradient(145deg, rgba(31, 38, 51, 0.92), rgba(16, 20, 28, 0.9)),
          var(--panel);
        box-shadow: var(--shadow);
      }

      .title-frame {
        background:
          linear-gradient(145deg, rgba(26, 32, 43, 0.88), rgba(15, 18, 24, 0.95)),
          var(--panel);
      }

      .eyebrow,
      .card-kicker,
      .slide-index {
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: var(--accent);
        font-size: var(--small-size);
        font-weight: 700;
      }

      .slide-index {
        margin-bottom: 16px;
      }

      .title-grid,
      .two-col,
      .boundary-grid,
      .claims-grid,
      .sources-grid {
        display: grid;
        gap: var(--card-gap);
      }

      .title-grid,
      .two-col {
        grid-template-columns: minmax(0, 1.35fr) minmax(270px, 0.8fr);
        align-items: start;
      }

      .claims-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-top: 22px;
      }

      .sources-grid,
      .boundary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 20px;
      }

      .stack > * + * {
        margin-top: 14px;
      }

      h1 {
        font-family: "Fraunces", serif;
        font-size: var(--title-size);
        line-height: 0.94;
        max-width: 11ch;
      }

      h2 {
        font-family: "Fraunces", serif;
        font-size: var(--h2-size);
        line-height: 1.02;
      }

      h3 {
        font-size: var(--h3-size);
        line-height: 1.18;
      }

      p,
      li {
        font-size: var(--body-size);
        line-height: 1.58;
        color: var(--muted);
      }

      .summary {
        max-width: 56ch;
      }

      .thesis {
        padding: 18px 20px;
        border-left: 4px solid var(--accent);
        border-radius: 18px;
        background: var(--accent-soft);
        color: var(--ink);
      }

      .metric-board,
      .claim-card,
      .source-card,
      .boundary-card,
      .closing-card {
        padding: 18px;
        border: 1px solid var(--line);
        border-radius: 22px;
        background: var(--panel-strong);
      }

      .metric-board dl {
        display: grid;
        gap: 12px;
      }

      .metric-board dt {
        font-size: var(--small-size);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
      }

      .metric-board dd {
        margin: 2px 0 0;
        color: var(--ink);
        font-size: clamp(1rem, 1.8vw, 1.28rem);
      }

      .mini-list,
      .boundary-list {
        padding-left: 18px;
      }

      .boundary-list li {
        color: var(--ink);
      }

      .source-url {
        color: var(--ink);
        font-size: var(--small-size);
        word-break: break-word;
      }

      .source-meta {
        font-size: var(--small-size);
      }

      .community-note {
        margin-top: 18px;
        padding: 16px 18px;
        border-radius: 20px;
        border: 1px dashed rgba(240, 179, 116, 0.32);
        background: rgba(240, 179, 116, 0.08);
      }

      .closing-grid {
        display: grid;
        gap: 18px;
        margin-top: 22px;
      }

      .reveal {
        opacity: 0;
        transform: translateY(28px);
        transition:
          opacity 420ms var(--ease),
          transform 420ms var(--ease);
      }

      .slide.visible .reveal {
        opacity: 1;
        transform: translateY(0);
      }

      .slide.visible .reveal:nth-child(1) { transition-delay: 60ms; }
      .slide.visible .reveal:nth-child(2) { transition-delay: 120ms; }
      .slide.visible .reveal:nth-child(3) { transition-delay: 180ms; }
      .slide.visible .reveal:nth-child(4) { transition-delay: 240ms; }
      .slide.visible .reveal:nth-child(5) { transition-delay: 300ms; }

      @media (max-width: 980px) {
        .title-grid,
        .two-col,
        .claims-grid,
        .sources-grid,
        .boundary-grid {
          grid-template-columns: 1fr;
        }

        .dots {
          display: none;
        }
      }

      @media (max-height: 720px) {
        :root {
          --slide-padding: clamp(18px, 3.2vw, 28px);
          --card-gap: clamp(10px, 1.2vw, 14px);
          --title-size: clamp(1.9rem, 5.2vw, 4.5rem);
          --body-size: clamp(0.82rem, 1vw, 0.98rem);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        html,
        body {
          scroll-behavior: auto;
        }

        * {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="progress" aria-hidden="true">
      <div class="progress-bar" id="progressBar"></div>
    </div>

    <div class="dots" id="dots" aria-label="Slide navigation"></div>

    <div class="slide-nav">
      <button class="nav-button" id="prevSlide" type="button">Prev</button>
      <button class="nav-button" id="nextSlide" type="button">Next</button>
    </div>

    <main class="deck" id="deck">
      <section class="slide title-slide">
        <div class="slide-frame title-frame">
          <div class="title-grid">
            <div class="stack">
              <p class="slide-index reveal">01 / AI Procurement Briefing</p>
              <p class="eyebrow reveal">OpenFons Workbench Deck</p>
              <h1 class="reveal">${escapeHtml(report.title)}</h1>
              <p class="summary reveal">${escapeHtml(report.summary)}</p>
              <p class="thesis reveal">${escapeHtml(report.thesis)}</p>
            </div>
            <aside class="metric-board reveal">
              <dl>
                <div>
                  <dt>Audience</dt>
                  <dd>${escapeHtml(report.audience)}</dd>
                </div>
                <div>
                  <dt>Geo</dt>
                  <dd>${escapeHtml(report.geo)}</dd>
                </div>
                <div>
                  <dt>Language</dt>
                  <dd>${escapeHtml(report.language)}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>${escapeHtml(report.updatedAt)}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </section>

      <section class="slide thesis-slide">
        <div class="slide-frame">
          <div class="two-col">
            <div class="stack">
              <p class="slide-index reveal">02 / Decision Frame</p>
              <h2 class="reveal">The fast answer is not the safe answer.</h2>
              <p class="thesis reveal">${escapeHtml(report.thesis)}</p>
              <p class="reveal">
                ${escapeHtml(report.sections[0]?.body ?? 'Use official pricing and availability pages to set the baseline, then caveat relay convenience and community pain points.')}
              </p>
            </div>
            <aside class="closing-card stack reveal">
              <p class="card-kicker">Scope</p>
              <h3>${escapeHtml(report.sections[1]?.title ?? 'Evidence Scope')}</h3>
              <p>${escapeHtml(report.sections[1]?.body ?? 'This first run covers provider pricing, relay pricing, and official region availability only.')}</p>
            </aside>
          </div>
        </div>
      </section>

      <section class="slide claims-slide">
        <div class="slide-frame">
          <p class="slide-index reveal">03 / Core Claims</p>
          <h2 class="reveal">Three signals should shape the buying decision.</h2>
          <div class="claims-grid">
            ${renderClaimCards(reportView)}
          </div>
        </div>
      </section>

      <section class="slide sources-slide">
        <div class="slide-frame">
          <p class="slide-index reveal">04 / Source Stack</p>
          <h2 class="reveal">Official pages anchor the answer. Everything else stays caveated.</h2>
          <div class="sources-grid">
            ${renderSourceCards(reportView)}
          </div>
          ${
            communitySource
              ? `
                <div class="community-note reveal">
                  <p class="card-kicker">Corroboration</p>
                  <p>
                    ${escapeHtml(communitySource.title)} remains supporting evidence only. It can validate operator friction,
                    but it cannot override current official pricing or access rules.
                  </p>
                </div>
              `
              : ''
          }
        </div>
      </section>

      <section class="slide guardrails-slide">
        <div class="slide-frame">
          <p class="slide-index reveal">05 / Guardrails</p>
          <h2 class="reveal">This case is useful because it states both boundaries and risks.</h2>
          <div class="boundary-grid">
            <article class="boundary-card reveal">
              <p class="card-kicker">Evidence Boundaries</p>
              <ul class="boundary-list">
                ${renderList(report.evidenceBoundaries)}
              </ul>
            </article>
            <article class="boundary-card reveal">
              <p class="card-kicker">Risks</p>
              <ul class="boundary-list">
                ${renderList(report.risks)}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section class="slide closing-slide">
        <div class="slide-frame">
          <p class="slide-index reveal">06 / Closing</p>
          <h2 class="reveal">OpenFons now has two delivery surfaces for the same report truth.</h2>
          <div class="closing-grid">
            <article class="closing-card reveal">
              <p class="card-kicker">Latest Update</p>
              <h3>${escapeHtml(lastUpdate.note)}</h3>
              <p>${escapeHtml(lastUpdate.at)}</p>
            </article>
            <article class="closing-card reveal">
              <p class="card-kicker">Surface Split</p>
              <ul class="mini-list">
                <li>Detailed reading: report HTML</li>
                <li>Demo and briefing: deck HTML</li>
                <li>Single source of truth: current AI procurement report data</li>
              </ul>
            </article>
          </div>
        </div>
      </section>
    </main>

    <script>
      (() => {
        const slides = Array.from(document.querySelectorAll('.slide'));
        const dotsRoot = document.getElementById('dots');
        const progressBar = document.getElementById('progressBar');
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let current = 0;

        const goTo = (index) => {
          const nextIndex = Math.max(0, Math.min(index, slides.length - 1));
          slides[nextIndex].scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'start'
          });
        };

        const syncUi = (index) => {
          current = index;
          const progress = slides.length === 1 ? 1 : index / (slides.length - 1);
          progressBar.style.width = \`\${Math.max(progress, 0.04) * 100}%\`;
          Array.from(dotsRoot.querySelectorAll('.dot')).forEach((dot, dotIndex) => {
            dot.classList.toggle('active', dotIndex === index);
            dot.setAttribute('aria-current', dotIndex === index ? 'true' : 'false');
          });
        };

        slides.forEach((slide, index) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'dot';
          dot.setAttribute('aria-label', \`Go to slide \${index + 1}\`);
          dot.addEventListener('click', () => goTo(index));
          dotsRoot.appendChild(dot);
        });

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const index = slides.indexOf(entry.target);
                entry.target.classList.add('visible');
                syncUi(index);
              }
            });
          },
          { threshold: 0.62 }
        );

        slides.forEach((slide) => observer.observe(slide));

        document.getElementById('prevSlide').addEventListener('click', () => goTo(current - 1));
        document.getElementById('nextSlide').addEventListener('click', () => goTo(current + 1));

        document.addEventListener('keydown', (event) => {
          if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
            event.preventDefault();
            goTo(current + 1);
          }

          if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
            event.preventDefault();
            goTo(current - 1);
          }
        });

        syncUi(0);
      })();
    </script>
  </body>
</html>`;
};

export const buildDirectApiVsOpenRouterDeckHtml = async (): Promise<string> => {
  const reportView = await buildDirectApiVsOpenRouterReportView();
  return renderDeckHtml(reportView);
};

export const exportDirectApiVsOpenRouterWorkbenchDeckHtml = async (
  outputPath: string
): Promise<string> => {
  const html = await buildDirectApiVsOpenRouterDeckHtml();
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, 'utf8');
  return html;
};
