'use strict';

const CONFIG = {
  dataUrl: 'news.json',
  dateLocale: 'ar-SA',
};

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    showError('معرّف الخبر مفقود');
    return;
  }
  loadArticle(id);
});

async function loadArticle(id) {
  try {
    const res = await fetch(CONFIG.dataUrl + '?t=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (!data.articles || !Array.isArray(data.articles)) {
      throw new Error('تنسيق البيانات غير صحيح');
    }
    const art = data.articles.find(a => a.id === decodeURIComponent(id));
    if (!art) throw new Error('الخبر غير موجود');
    renderArticle(art);
  } catch (err) {
    console.error('[CyberWatch Article]', err);
    showError(err.message);
  }
}

function renderArticle(art) {
  document.title = `${art.title} | سايبر ووتش`;

  const container = document.getElementById('articleContainer');
  const loading = document.getElementById('articleLoading');

  const bodyHTML = art.content
    ? art.content.split('\n\n').map(p => `<p class="article-paragraph">${escHtml(p)}</p>`).join('')
    : `<p class="article-paragraph">${escHtml(art.summary)}</p>`;

  container.innerHTML = `
    <div class="article-header">
      <span class="article-category">${escHtml(art.category || 'عام')}</span>
      <h1 class="article-title">${escHtml(art.title)}</h1>
      <div class="article-meta">
        <span class="article-source">${escHtml(art.source)}</span>
        <span class="article-date">${formatDate(art.publishedAt || art.date)}</span>
      </div>
    </div>

    <img class="article-image"
         src="${escHtml(art.imageUrl || '')}"
         alt="${escHtml(art.title)}"
         onerror="this.style.display='none'" />

    <div class="article-body">
      ${bodyHTML}
    </div>

    ${buildTagsHTML(art.tags)}

    <div class="article-source-link-wrap">
      <a class="article-source-link"
         href="${escHtml(art.sourceUrl || '#')}"
         target="_blank"
         rel="noopener noreferrer">
        ↗ قراءة المقال الأصلي على ${escHtml(art.source)}
      </a>
    </div>
  `;

  loading.classList.add('hidden');
  container.classList.remove('hidden');
}

function showError(msg) {
  document.getElementById('articleLoading').classList.add('hidden');
  document.getElementById('errorMsg').textContent = msg;
  document.getElementById('articleError').classList.remove('hidden');
}

function buildTagsHTML(tags) {
  if (!tags || !tags.length) return '';
  return `<div class="article-tags">${tags.map(t => `<span class="card-tag">${escHtml(t)}</span>`).join('')}</div>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(CONFIG.dateLocale, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
