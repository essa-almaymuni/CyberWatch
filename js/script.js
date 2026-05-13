/**
 * CYBER WATCH — script.js
 * Fetches news.json and renders articles dynamically.
 * Zero dependencies · Vanilla JS
 */

'use strict';

/* ═══════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════ */
const CONFIG = {
  dataUrl: 'data/news.json',        // Path to your JSON data file
  retryDelay: 3000,                 // ms before retry on failure
  animationStagger: 80,             // ms between card animations
  dateLocale: 'ar-SA',             // Arabic date formatting
};

/* ═══════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════ */
let state = {
  allArticles: [],
  filteredArticles: [],
  activeFilter: 'all',
  searchQuery: '',
  sortOrder: 'newest',
};

/* ═══════════════════════════════════════════════════
   DOM REFERENCES
═══════════════════════════════════════════════════ */
const dom = {
  grid:           () => document.getElementById('articlesGrid'),
  featured:       () => document.getElementById('featuredArticle'),
  emptyState:     () => document.getElementById('emptyState'),
  errorState:     () => document.getElementById('errorState'),
  errorMessage:   () => document.getElementById('errorMessage'),
  retryBtn:       () => document.getElementById('retryBtn'),
  searchInput:    () => document.getElementById('searchInput'),
  sortSelect:     () => document.getElementById('sortSelect'),
  statusText:     () => document.getElementById('statusText'),
  totalArticles:  () => document.getElementById('totalArticles'),
  lastUpdate:     () => document.getElementById('lastUpdate'),
  tickerTrack:    () => document.getElementById('tickerTrack'),
  modal:          () => document.getElementById('articleModal'),
  modalContent:   () => document.getElementById('modalContent'),
  modalClose:     () => document.getElementById('modalClose'),
  navLinks:       () => document.querySelectorAll('.nav-link'),
};

/* ═══════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadNews();
  bindEvents();
});

/* ═══════════════════════════════════════════════════
   DATA LOADING
═══════════════════════════════════════════════════ */
async function loadNews() {
  showSkeletons();
  setStatus('جارٍ تحميل البيانات...', false);

  try {
    const res = await fetch(CONFIG.dataUrl + '?t=' + Date.now()); // bust cache
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    if (!data.articles || !Array.isArray(data.articles)) {
      throw new Error('تنسيق البيانات غير صحيح');
    }

    state.allArticles = data.articles;
    state.filteredArticles = [...state.allArticles];

    updateMeta(data);
    applyFilters();
    setStatus(`${data.articles.length} خبر · نشط`, true);
    hideError();

  } catch (err) {
    console.error('[CyberWatch] فشل تحميل الأخبار:', err);
    showError(`فشل التحميل: ${err.message}`);
    setStatus('خطأ في الاتصال', false);
  }
}

/* ═══════════════════════════════════════════════════
   META UPDATES
═══════════════════════════════════════════════════ */
function updateMeta(data) {
  // Total count
  const totalEl = dom.totalArticles();
  if (totalEl) totalEl.textContent = data.articles.length;

  // Last updated
  if (data.lastUpdated) {
    const date = new Date(data.lastUpdated);
    const timeAgo = getTimeAgo(date);
    const lastUpdateEl = dom.lastUpdate();
    if (lastUpdateEl) lastUpdateEl.textContent = timeAgo;
  }

  // Ticker
  buildTicker(data.articles);
}

function buildTicker(articles) {
  const el = dom.tickerTrack();
  if (!el || !articles.length) return;
  const titles = articles.slice(0, 5).map(a => `⚡ ${a.title}`).join(' ⸺ ');
  el.textContent = titles + ' ⸺ ';
}

/* ═══════════════════════════════════════════════════
   FILTERING & SORTING
═══════════════════════════════════════════════════ */
function applyFilters() {
  let results = [...state.allArticles];

  // Category filter
  if (state.activeFilter !== 'all') {
    results = results.filter(a => a.category === state.activeFilter);
  }

  // Search query
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.trim().toLowerCase();
    results = results.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  // Sorting
  results.sort((a, b) => {
    const dA = new Date(a.publishedAt);
    const dB = new Date(b.publishedAt);
    return state.sortOrder === 'newest' ? dB - dA : dA - dB;
  });

  state.filteredArticles = results;
  renderAll();
}

/* ═══════════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════════ */
function renderAll() {
  renderFeatured();
  renderGrid();
}

function renderFeatured() {
  const container = dom.featured();
  if (!container || !state.filteredArticles.length) return;

  // Pick first/newest article as featured
  const art = state.filteredArticles[0];
  container.innerHTML = buildFeaturedHTML(art);

  container.querySelector('.featured-card')?.addEventListener('click', () => {
    openModal(art);
  });
}

function buildFeaturedHTML(art) {
  return `
    <article class="featured-card" role="listitem" tabindex="0" aria-label="الخبر المميز: ${escHtml(art.title)}">
      <div class="featured-image-wrap">
        <img src="${escHtml(art.imageUrl || fallbackImage(art.category))}"
             alt="${escHtml(art.title)}"
             loading="lazy"
             onerror="this.src='${fallbackImage(art.category)}'" />
        <span class="featured-badge">مميز</span>
      </div>
      <div class="featured-body">
        <span class="featured-category">${escHtml(art.category || 'عام')}</span>
        <h2 class="featured-title">${escHtml(art.title)}</h2>
        <p class="featured-summary">${escHtml(art.summary)}</p>
        <div class="featured-meta">
          <span class="meta-source">${escHtml(art.source)}</span>
          <span class="meta-date">${formatDate(art.publishedAt)}</span>
        </div>
        <button class="featured-cta">
          قراءة التفاصيل
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L1 7L7 13M1 7H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </article>
  `;
}

function renderGrid() {
  const grid = dom.grid();
  const empty = dom.emptyState();
  if (!grid) return;

  grid.innerHTML = '';

  if (!state.filteredArticles.length) {
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  // Skip first (featured) and render the rest
  const cardsToRender = state.filteredArticles.slice(1);

  cardsToRender.forEach((art, idx) => {
    const card = buildCardElement(art, idx);
    grid.appendChild(card);
  });
}

function buildCardElement(art, delay) {
  const card = document.createElement('article');
  card.className = 'news-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', art.title);
  card.style.animationDelay = `${delay * CONFIG.animationStagger}ms`;

  card.innerHTML = `
    <div class="card-image-wrap">
      <img src="${escHtml(art.imageUrl || fallbackImage(art.category))}"
           alt="${escHtml(art.title)}"
           loading="lazy"
           onerror="this.src='${fallbackImage(art.category)}'" />
      <span class="card-category ${getCategoryClass(art.category)}">${escHtml(art.category || 'عام')}</span>
    </div>
    <div class="card-body">
      <h3 class="card-title">${escHtml(art.title)}</h3>
      <p class="card-summary">${escHtml(art.summary)}</p>
      ${buildTagsHTML(art.tags)}
    </div>
    <div class="card-footer">
      <span class="card-source">${escHtml(art.source)}</span>
      <span class="card-date">${formatDate(art.publishedAt)}</span>
    </div>
  `;

  card.addEventListener('click', () => openModal(art));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(art); }
  });

  return card;
}

function buildTagsHTML(tags) {
  if (!tags || !tags.length) return '';
  return `<div class="card-tags">${tags.map(t => `<span class="card-tag">${escHtml(t)}</span>`).join('')}</div>`;
}

/* ═══════════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════════ */
function openModal(art) {
  const modal = dom.modal();
  const content = dom.modalContent();
  if (!modal || !content) return;

  content.innerHTML = `
    <p class="modal-category">${escHtml(art.category || 'عام')}</p>
    <h2 class="modal-title" id="modalTitle">${escHtml(art.title)}</h2>
    <img class="modal-image"
         src="${escHtml(art.imageUrl || fallbackImage(art.category))}"
         alt="${escHtml(art.title)}"
         loading="lazy"
         onerror="this.style.display='none'" />
    <p class="modal-summary">${escHtml(art.summary)}</p>
    ${buildTagsHTML(art.tags)}
    <div class="modal-meta">
      <a class="modal-source-link"
         href="${escHtml(art.sourceUrl || '#')}"
         target="_blank"
         rel="noopener noreferrer">
        ↗ ${escHtml(art.source)}
      </a>
      <span class="modal-date">${formatDate(art.publishedAt, true)}</span>
    </div>
  `;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  dom.modalClose()?.focus();
}

function closeModal() {
  const modal = dom.modal();
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════════
   EVENT BINDING
═══════════════════════════════════════════════════ */
function bindEvents() {
  // Nav filter links
  dom.navLinks().forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      dom.navLinks().forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      state.activeFilter = link.dataset.filter || 'all';
      applyFilters();
    });
  });

  // Search
  const searchEl = dom.searchInput();
  if (searchEl) {
    let debounceTimer;
    searchEl.addEventListener('input', e => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.searchQuery = e.target.value;
        applyFilters();
      }, 300);
    });
  }

  // Sort
  const sortEl = dom.sortSelect();
  if (sortEl) {
    sortEl.addEventListener('change', e => {
      state.sortOrder = e.target.value;
      applyFilters();
    });
  }

  // Modal close button
  dom.modalClose()?.addEventListener('click', closeModal);

  // Modal backdrop click
  dom.modal()?.addEventListener('click', e => {
    if (e.target === dom.modal()) closeModal();
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Retry button
  dom.retryBtn()?.addEventListener('click', loadNews);
}

/* ═══════════════════════════════════════════════════
   UI STATE HELPERS
═══════════════════════════════════════════════════ */
function showSkeletons() {
  const grid = dom.grid();
  if (!grid) return;
  grid.innerHTML = Array(5).fill(
    '<div class="skeleton-card" aria-hidden="true"></div>'
  ).join('');
}

function setStatus(text, online) {
  const el = dom.statusText();
  if (!el) return;
  el.textContent = text;
  const dot = el.closest('.header-status')?.querySelector('.status-dot');
  if (dot) {
    dot.style.background = online ? 'var(--accent-green)' : 'var(--accent-red)';
    dot.style.boxShadow = online
      ? '0 0 8px var(--accent-green)'
      : '0 0 8px var(--accent-red)';
  }
}

function showError(msg) {
  const grid = dom.grid();
  const errorEl = dom.errorState();
  const msgEl = dom.errorMessage();
  if (grid) grid.innerHTML = '';
  if (msgEl) msgEl.textContent = msg;
  if (errorEl) errorEl.classList.remove('hidden');
}

function hideError() {
  dom.errorState()?.classList.add('hidden');
}

/* ═══════════════════════════════════════════════════
   UTILITY FUNCTIONS
═══════════════════════════════════════════════════ */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(isoString, long = false) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (long) {
      return date.toLocaleDateString(CONFIG.dateLocale, {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }
    return date.toLocaleDateString(CONFIG.dateLocale, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function getTimeAgo(date) {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `منذ ${diffHr} ساعة`;
  const diffDay = Math.floor(diffHr / 24);
  return `منذ ${diffDay} يوم`;
}

function getCategoryClass(category) {
  const map = {
    'ثغرات أمنية':     'category-vuln',
    'برامج الفدية':    'category-ransomware',
    'تهديدات متطورة': 'category-apt',
    'أمن سلسلة التوريد': 'category-supply',
    'إنفاذ القانون':   'category-law',
    'تحديثات أمنية':  'category-patch',
  };
  return map[category] || 'category-default';
}

function fallbackImage(category) {
  // Returns a simple SVG placeholder as data URI
  const color = {
    'ثغرات أمنية': '%23ff3355',
    'برامج الفدية': '%23ff6b35',
    'تهديدات متطورة': '%238b5cf6',
    'default': '%2300d4ff',
  }[category] || '%2300d4ff';

  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 300'%3E%3Crect width='600' height='300' fill='%230f1424'/%3E%3Ctext x='50%25' y='50%25' fill='${color}' font-family='monospace' font-size='48' text-anchor='middle' dominant-baseline='middle' opacity='0.2'%3E⬡%3C/text%3E%3C/svg%3E`;
}
