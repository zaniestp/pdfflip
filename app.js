/**
 * FlipBook Reader — app.js
 * PDF.js-powered flipbook with two-page desktop spread,
 * animated page turn, single-page mobile swipe, and full-text search.
 */

'use strict';

// ── PDF.js worker ────────────────────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const BOOKS_FILE = 'books.inc';
const DATA_DIR   = 'data/';
const IS_MOBILE  = () => window.innerWidth <= 768;

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  pdfDoc:       null,
  totalPages:   0,
  currentSpread: 0,   // 0-indexed spread (pair of pages on desktop)
  currentPage:  1,    // 1-indexed (mobile)
  rendering:    false,
  flipping:     false,
  bookTitle:    '',
  // Search
  searchQuery:    '',
  searchMatches:  [],  // [{page, items:[TextItem]}]
  searchIndex:    -1,
  pageTextCache:  {},  // pageNum → full text
  // Swipe
  touchStartX:  0,
  touchStartY:  0,
};

// ── DOM References ─────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const libraryScreen   = $('library-screen');
const readerScreen    = $('reader-screen');
const bookShelf       = $('book-shelf');
const libLoading      = $('lib-loading');
const readerTitle     = $('reader-title');
const pageIndicator   = $('page-indicator');
const btnBack         = $('btn-back');
const btnPrev         = $('btn-prev');
const btnNext         = $('btn-next');
const btnSearchToggle = $('btn-search-toggle');
const btnSearchClose  = $('btn-search-close');
const btnPrevResult   = $('btn-prev-result');
const btnNextResult   = $('btn-next-result');
const btnFullscreen   = $('btn-fullscreen');
const searchBar       = $('search-bar');
const searchInput     = $('search-input');
const searchCount     = $('search-count');
const readerLoading   = $('reader-loading');
const readerLoadTxt   = $('reader-loading-text');

// Desktop canvases
const canvasLeft      = $('canvas-left');
const canvasRight     = $('canvas-right');
const canvasFlipFront = $('canvas-flip-front');
const canvasFlipBack  = $('canvas-flip-back');
const flipCard        = $('flip-card');
const flipOverlay     = $('flip-overlay');
const pageNumLeft     = $('page-num-left');
const pageNumRight    = $('page-num-right');

// Mobile canvas
const canvasMobile    = $('canvas-mobile');
const mobilePage      = $('mobile-page');
const pageNumMobile   = $('page-num-mobile');


// ════════════════════════════════════════════════════════════════════════════
//  LIBRARY — load books.inc and render shelf
// ════════════════════════════════════════════════════════════════════════════

async function loadLibrary() {
  try {
    const res  = await fetch(BOOKS_FILE + '?t=' + Date.now());
    const text = await res.text();
    const books = text.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    libLoading.style.display = 'none';

    if (books.length === 0) {
      bookShelf.innerHTML = `
        <div class="lib-empty">
          <h3>No books found</h3>
          <p>Add PDF filenames to <code>books.inc</code> and place PDFs in the <code>data/</code> folder.</p>
        </div>`;
      return;
    }

    books.forEach((filename, i) => {
      const name = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      const card = document.createElement('div');
      card.className = 'book-card';
      card.style.animationDelay = `${i * 60}ms`;
      card.innerHTML = `
        <div class="book-card-cover">
          <div class="book-card-cover-inner">
            <div class="book-card-icon">📕</div>
            <div class="book-card-name">${escHtml(name)}</div>
          </div>
        </div>
        <span class="book-card-label">${escHtml(filename)}</span>`;
      card.addEventListener('click', () => openBook(filename, name));
      bookShelf.appendChild(card);
    });
  } catch (err) {
    libLoading.innerHTML = `<p style="color:var(--gold)">⚠ Could not load books.inc<br><small>${err.message}</small></p>`;
  }
}


// ════════════════════════════════════════════════════════════════════════════
//  OPEN BOOK
// ════════════════════════════════════════════════════════════════════════════

async function openBook(filename, title) {
  // Reset state first
  state.pdfDoc        = null;
  state.totalPages    = 0;
  state.currentSpread = 0;
  state.currentPage   = 1;
  state.rendering     = false;
  state.flipping      = false;
  state.searchMatches = [];
  state.searchIndex   = -1;
  state.pageTextCache = {};
  searchInput.value   = '';
  searchCount.textContent = '';
  searchBar.classList.remove('open');
  btnSearchToggle.classList.remove('active');

  readerTitle.textContent = title;
  state.bookTitle = title;

  // Show reader screen — start transparent, fade in
  readerScreen.style.opacity = '0';
  readerScreen.style.display = 'flex';
  readerScreen.classList.add('active');
  showReaderLoading('Opening book…');

  // Fade out library
  libraryScreen.style.opacity = '0';
  await wait(300);
  libraryScreen.classList.remove('active');
  libraryScreen.style.display = 'none';
  libraryScreen.style.opacity = '';  // reset for next time
  readerScreen.style.opacity = '';   // let CSS opacity:1 take over

  try {
    const url      = DATA_DIR + filename;
    const loadTask = pdfjsLib.getDocument({ url });

    loadTask.onProgress = (p) => {
      if (p.total) {
        const pct = Math.round((p.loaded / p.total) * 100);
        readerLoadTxt.textContent = `Loading… ${pct}%`;
      }
    };

    state.pdfDoc     = await loadTask.promise;
    state.totalPages = state.pdfDoc.numPages;

    hideReaderLoading();
    updateNavButtons();

    // Let layout settle before measuring dimensions for canvas sizing
    await wait(50);
    await renderCurrentView();

    // Pre-cache text for search (background task)
    cacheAllText();

  } catch (err) {
    readerLoadTxt.textContent = `⚠ Failed to load: ${err.message}`;
    console.error('openBook error:', err);
  }
}


// ════════════════════════════════════════════════════════════════════════════
//  RENDER — desktop spread + mobile
// ════════════════════════════════════════════════════════════════════════════

async function renderCurrentView() {
  if (!state.pdfDoc || state.rendering) return;
  state.rendering = true;

  if (IS_MOBILE()) {
    await renderMobilePage(state.currentPage);
  } else {
    await renderDesktopSpread(state.currentSpread);
  }

  updatePageIndicator();
  updateNavButtons();
  state.rendering = false;
}

/* ─ Desktop: render left + right pages ─ */
async function renderDesktopSpread(spreadIndex) {
  const leftPageNum  = spreadIndex * 2 + 1;
  const rightPageNum = spreadIndex * 2 + 2;

  const stage = document.querySelector('.book-stage');
  const stageW = stage.clientWidth  - 48;
  const stageH = stage.clientHeight - 80;

  // Get dimensions from first page to set up
  const firstPage = await state.pdfDoc.getPage(Math.min(leftPageNum, state.totalPages));
  const vp0 = firstPage.getViewport({ scale: 1 });

  // Each page gets half the width
  const pageW = Math.floor(stageW / 2);
  const scale = Math.min(pageW / vp0.width, stageH / vp0.height, 2.5);

  const renderW = Math.floor(vp0.width  * scale);
  const renderH = Math.floor(vp0.height * scale);

  // Position flip overlay
  flipOverlay.style.width  = (renderW * 2 + 8) + 'px';
  flipOverlay.style.height = renderH + 'px';

  // Set canvas sizes
  [canvasLeft, canvasRight].forEach(c => { c.width = renderW; c.height = renderH; });

  // Render left page
  if (leftPageNum <= state.totalPages) {
    const page = await state.pdfDoc.getPage(leftPageNum);
    const vp   = page.getViewport({ scale });
    canvasLeft.width  = Math.floor(vp.width);
    canvasLeft.height = Math.floor(vp.height);
    await page.render({ canvasContext: canvasLeft.getContext('2d'), viewport: vp }).promise;
    pageNumLeft.textContent = leftPageNum;
  } else {
    clearCanvas(canvasLeft);
    pageNumLeft.textContent = '';
  }

  // Render right page
  if (rightPageNum <= state.totalPages) {
    const page = await state.pdfDoc.getPage(rightPageNum);
    const vp   = page.getViewport({ scale });
    canvasRight.width  = Math.floor(vp.width);
    canvasRight.height = Math.floor(vp.height);
    await page.render({ canvasContext: canvasRight.getContext('2d'), viewport: vp }).promise;
    pageNumRight.textContent = rightPageNum;
  } else {
    clearCanvas(canvasRight);
    pageNumRight.textContent = '';
  }

  // Apply search highlights
  drawHighlightsDesktop(scale, vp0.width, vp0.height);
}

/* ─ Mobile: render single page ─ */
async function renderMobilePage(pageNum) {
  if (pageNum < 1 || pageNum > state.totalPages) return;

  const stage = document.querySelector('.book-stage');
  const w = stage.clientWidth  - 24;
  const h = stage.clientHeight - 48;

  const page = await state.pdfDoc.getPage(pageNum);
  const vp0  = page.getViewport({ scale: 1 });
  const scale = Math.min(w / vp0.width, h / vp0.height, 2.5);
  const vp    = page.getViewport({ scale });

  canvasMobile.width  = Math.floor(vp.width);
  canvasMobile.height = Math.floor(vp.height);
  await page.render({ canvasContext: canvasMobile.getContext('2d'), viewport: vp }).promise;
  pageNumMobile.textContent = pageNum;

  drawHighlightsMobile(pageNum, scale, vp0);
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}


// ════════════════════════════════════════════════════════════════════════════
//  PAGE-FLIP ANIMATION (desktop)
// ════════════════════════════════════════════════════════════════════════════

async function animateFlip(direction) {
  if (state.flipping) return;

  const spread = state.currentSpread;
  const nextSpread = spread + direction;

  if (nextSpread < 0 || nextSpread * 2 >= state.totalPages) return;

  state.flipping = true;

  const leftPageNum  = spread     * 2 + 1;
  const rightPageNum = spread     * 2 + 2;
  const nLeftNum     = nextSpread * 2 + 1;
  const nRightNum    = nextSpread * 2 + 2;

  // Size flip card same as a single page
  const renderW = canvasLeft.width;
  const renderH = canvasLeft.height;

  flipCard.style.width  = renderW + 'px';
  flipCard.style.height = renderH + 'px';
  canvasFlipFront.width = canvasFlipBack.width  = renderW;
  canvasFlipFront.height= canvasFlipBack.height = renderH;

  const scale = renderW / (await state.pdfDoc.getPage(1).then(p => p.getViewport({scale:1}).width));

  if (direction === 1) {
    // Forward: flip the right page
    flipCard.style.left = renderW + 8 + 'px'; // over right page
    flipCard.style.transformOrigin = 'left center';
    flipCard.style.transform = 'rotateY(0deg)';

    // Front = current right page, Back = next left page
    if (rightPageNum <= state.totalPages) {
      await renderPageToCanvas(rightPageNum, canvasFlipFront, scale);
    }
    if (nLeftNum <= state.totalPages) {
      await renderPageToCanvas(nLeftNum, canvasFlipBack, scale);
    }

    flipCard.style.display = 'block';
    flipCard.classList.add('flipping-forward');

    await wait(700);
    flipCard.classList.remove('flipping-forward');
    flipCard.style.display = 'none';

    state.currentSpread = nextSpread;
    state.currentPage   = nLeftNum;

  } else {
    // Backward: flip the left page back
    flipCard.style.left = '0px';
    flipCard.style.transformOrigin = 'right center';
    flipCard.style.transform = 'rotateY(0deg)';

    // Front = next right page, Back = current left page
    if (nRightNum <= state.totalPages) {
      await renderPageToCanvas(nRightNum, canvasFlipFront, scale);
    }
    if (leftPageNum <= state.totalPages) {
      await renderPageToCanvas(leftPageNum, canvasFlipBack, scale);
    }

    flipCard.style.display = 'block';

    // For backward, immediately show as flipped then animate back
    flipCard.style.transform = 'rotateY(-180deg)';
    await wait(30); // let browser paint
    flipCard.classList.add('flipping-backward');
    await wait(700);
    flipCard.classList.remove('flipping-backward');
    flipCard.style.display = 'none';

    state.currentSpread = nextSpread;
    state.currentPage   = nLeftNum;
  }

  await renderDesktopSpread(state.currentSpread);
  updateNavButtons();
  updatePageIndicator();
  state.flipping = false;
}

async function renderPageToCanvas(pageNum, canvas, targetScale) {
  const page = await state.pdfDoc.getPage(pageNum);
  const vp0  = page.getViewport({ scale: 1 });
  const vp   = page.getViewport({ scale: targetScale });
  canvas.width  = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
}


// ════════════════════════════════════════════════════════════════════════════
//  MOBILE SWIPE NAVIGATION
// ════════════════════════════════════════════════════════════════════════════

function setupMobileSwipe() {
  mobilePage.addEventListener('touchstart', e => {
    state.touchStartX = e.touches[0].clientX;
    state.touchStartY = e.touches[0].clientY;
  }, { passive: true });

  mobilePage.addEventListener('touchend', async e => {
    const dx = e.changedTouches[0].clientX - state.touchStartX;
    const dy = e.changedTouches[0].clientY - state.touchStartY;
    if (Math.abs(dx) < Math.abs(dy) * 1.5 || Math.abs(dx) < 40) return;

    if (dx < 0 && state.currentPage < state.totalPages) {
      await animateMobilePage(1);
    } else if (dx > 0 && state.currentPage > 1) {
      await animateMobilePage(-1);
    }
  }, { passive: true });
}

async function animateMobilePage(direction) {
  if (state.rendering) return;

  const outClass = direction === 1 ? 'swiping-left' : 'swiping-right';
  const inClass  = direction === 1 ? 'slide-in-right' : 'slide-in-left';

  mobilePage.classList.add(outClass);
  await wait(350);
  mobilePage.classList.remove(outClass);

  state.currentPage += direction;
  if (IS_MOBILE()) {
    // sync spread for desktop
    state.currentSpread = Math.floor((state.currentPage - 1) / 2);
  }

  await renderMobilePage(state.currentPage);

  mobilePage.classList.add(inClass);
  await wait(350);
  mobilePage.classList.remove(inClass);

  updateNavButtons();
  updatePageIndicator();
}


// ════════════════════════════════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════════════════════════════════

async function goNext() {
  if (IS_MOBILE()) {
    if (state.currentPage < state.totalPages) await animateMobilePage(1);
  } else {
    const nextSpread = state.currentSpread + 1;
    if (nextSpread * 2 < state.totalPages) await animateFlip(1);
  }
}

async function goPrev() {
  if (IS_MOBILE()) {
    if (state.currentPage > 1) await animateMobilePage(-1);
  } else {
    if (state.currentSpread > 0) await animateFlip(-1);
  }
}

function updateNavButtons() {
  if (!state.pdfDoc) return;

  if (IS_MOBILE()) {
    btnPrev.disabled = state.currentPage <= 1;
    btnNext.disabled = state.currentPage >= state.totalPages;
  } else {
    btnPrev.disabled = state.currentSpread <= 0;
    btnNext.disabled = (state.currentSpread * 2 + 2) >= state.totalPages;
  }
}

function updatePageIndicator() {
  if (!state.pdfDoc) return;
  if (IS_MOBILE()) {
    pageIndicator.textContent = `Page ${state.currentPage} of ${state.totalPages}`;
  } else {
    const l = state.currentSpread * 2 + 1;
    const r = Math.min(l + 1, state.totalPages);
    const label = l === r ? `Page ${l}` : `Pages ${l}–${r}`;
    pageIndicator.textContent = `${label} of ${state.totalPages}`;
  }
}


// ════════════════════════════════════════════════════════════════════════════
//  SEARCH
// ════════════════════════════════════════════════════════════════════════════

async function cacheAllText() {
  for (let p = 1; p <= state.totalPages; p++) {
    if (state.pageTextCache[p]) continue;
    try {
      const page    = await state.pdfDoc.getPage(p);
      const content = await page.getTextContent();
      state.pageTextCache[p] = content.items.map(i => i.str).join(' ');
    } catch (_) {}
  }
}

async function doSearch(query) {
  state.searchQuery   = query.trim().toLowerCase();
  state.searchMatches = [];
  state.searchIndex   = -1;

  if (!state.searchQuery || !state.pdfDoc) {
    searchCount.textContent = '';
    return;
  }

  let total = 0;
  for (let p = 1; p <= state.totalPages; p++) {
    const text = (state.pageTextCache[p] || '').toLowerCase();
    let start  = 0, idx;
    const positions = [];
    while ((idx = text.indexOf(state.searchQuery, start)) !== -1) {
      positions.push(idx);
      start = idx + 1;
      total++;
    }
    if (positions.length) {
      state.searchMatches.push({ page: p, positions });
    }
  }

  searchCount.textContent = total === 0
    ? 'No results'
    : `${total} result${total !== 1 ? 's' : ''}`;

  if (state.searchMatches.length > 0) {
    state.searchIndex = 0;
    await jumpToMatch(0);
  }
}

async function jumpToMatch(matchGroupIdx) {
  if (matchGroupIdx < 0 || matchGroupIdx >= state.searchMatches.length) return;
  const match = state.searchMatches[matchGroupIdx];

  if (IS_MOBILE()) {
    state.currentPage = match.page;
    state.currentSpread = Math.floor((match.page - 1) / 2);
    await renderMobilePage(state.currentPage);
  } else {
    const spread = Math.floor((match.page - 1) / 2);
    if (spread !== state.currentSpread) {
      state.currentSpread = spread;
      state.currentPage   = spread * 2 + 1;
      await renderDesktopSpread(spread);
    } else {
      // Re-render with highlights
      drawHighlightsDesktop();
    }
  }
  updateNavButtons();
  updatePageIndicator();
}

function navigateSearchResult(delta) {
  if (!state.searchMatches.length) return;
  state.searchIndex = (state.searchIndex + delta + state.searchMatches.length) % state.searchMatches.length;
  jumpToMatch(state.searchIndex);
}

/* ─ Highlight rendering on canvas (desktop) ─ */
async function drawHighlightsDesktop() {
  if (!state.searchQuery) return;
  const leftPageNum  = state.currentSpread * 2 + 1;
  const rightPageNum = state.currentSpread * 2 + 2;

  await overlayHighlights(leftPageNum,  canvasLeft);
  await overlayHighlights(rightPageNum, canvasRight);
}

async function overlayHighlights(pageNum, canvas) {
  if (!state.searchQuery || pageNum < 1 || pageNum > state.totalPages) return;
  try {
    const page    = await state.pdfDoc.getPage(pageNum);
    const vp      = page.getViewport({ scale: canvas.width / page.getViewport({scale:1}).width });
    const content = await page.getTextContent();
    const ctx     = canvas.getContext('2d');

    content.items.forEach(item => {
      const text = item.str.toLowerCase();
      const q    = state.searchQuery;
      let start  = 0, idx;
      while ((idx = text.indexOf(q, start)) !== -1) {
        // Transform text item coordinates
        const tx    = pdfjsLib.Util.transform(vp.transform, item.transform);
        const x     = tx[4];
        const y     = tx[5];
        const charW = (item.width * vp.scale) / (item.str.length || 1);
        const charH = item.height * vp.scale;
        const hx    = x + idx * charW;
        const hy    = y - charH;
        const hw    = q.length * charW;

        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(hx, hy, hw, charH * 1.15);
        ctx.restore();
        start = idx + 1;
      }
    });
  } catch (err) {
    console.warn('Highlight error', err);
  }
}

async function drawHighlightsMobile(pageNum, scale, vp0) {
  if (!state.searchQuery || !state.pdfDoc) return;
  try {
    const page    = await state.pdfDoc.getPage(pageNum);
    const vp      = page.getViewport({ scale });
    const content = await page.getTextContent();
    const ctx     = canvasMobile.getContext('2d');

    content.items.forEach(item => {
      const text = item.str.toLowerCase();
      const q    = state.searchQuery;
      let start  = 0, idx;
      while ((idx = text.indexOf(q, start)) !== -1) {
        const tx    = pdfjsLib.Util.transform(vp.transform, item.transform);
        const x     = tx[4];
        const y     = tx[5];
        const charW = (item.width * scale) / (item.str.length || 1);
        const charH = item.height * scale;
        const hx    = x + idx * charW;
        const hy    = y - charH;
        const hw    = q.length * charW;

        ctx.save();
        ctx.globalAlpha = 0.38;
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(hx, hy, hw, charH * 1.15);
        ctx.restore();
        start = idx + 1;
      }
    });
  } catch (_) {}
}


// ════════════════════════════════════════════════════════════════════════════
//  UI HELPERS
// ════════════════════════════════════════════════════════════════════════════

function showReaderLoading(msg = 'Loading…') {
  readerLoadTxt.textContent = msg;
  readerLoading.classList.remove('hidden');
}
function hideReaderLoading() {
  readerLoading.classList.add('hidden');
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function goBackToLibrary() {
  // Fade out reader
  readerScreen.style.opacity = '0';
  // Show library underneath, start transparent
  libraryScreen.style.opacity = '0';
  libraryScreen.style.display = 'flex';
  libraryScreen.classList.add('active');
  await wait(300);
  readerScreen.classList.remove('active');
  readerScreen.style.display = 'none';
  readerScreen.style.opacity = '';
  libraryScreen.style.opacity = ''; // CSS opacity:1 takes over
  state.pdfDoc    = null;
  state.rendering = false;
  state.flipping  = false;
}


// ════════════════════════════════════════════════════════════════════════════
//  EVENT LISTENERS
// ════════════════════════════════════════════════════════════════════════════

btnBack.addEventListener('click', goBackToLibrary);

btnNext.addEventListener('click', goNext);
btnPrev.addEventListener('click', goPrev);

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (!state.pdfDoc) return;
  if (searchInput === document.activeElement) {
    if (e.key === 'Enter') {
      e.shiftKey ? navigateSearchResult(-1) : navigateSearchResult(1);
    }
    return;
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
    e.preventDefault(); goNext();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault(); goPrev();
  } else if (e.key === 'f' || e.key === 'F') {
    toggleSearch();
  } else if (e.key === 'Escape') {
    if (searchBar.classList.contains('open')) closeSearch();
    else goBackToLibrary();
  }
});

// Search
function toggleSearch() {
  if (searchBar.classList.contains('open')) {
    closeSearch();
  } else {
    searchBar.classList.add('open');
    btnSearchToggle.classList.add('active');
    setTimeout(() => searchInput.focus(), 300);
  }
}
function closeSearch() {
  searchBar.classList.remove('open');
  btnSearchToggle.classList.remove('active');
  searchInput.value = '';
  searchCount.textContent = '';
  state.searchQuery   = '';
  state.searchMatches = [];
  state.searchIndex   = -1;
  renderCurrentView();
}

btnSearchToggle.addEventListener('click', toggleSearch);
btnSearchClose.addEventListener('click', closeSearch);
btnPrevResult.addEventListener('click', () => navigateSearchResult(-1));
btnNextResult.addEventListener('click', () => navigateSearchResult(1));

let searchDebounce;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => doSearch(searchInput.value), 350);
});

// Fullscreen
btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});
document.addEventListener('fullscreenchange', () => {
  if (state.pdfDoc) renderCurrentView();
});

// Resize → re-render
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state.pdfDoc) renderCurrentView();
  }, 250);
});

// Mobile swipe
setupMobileSwipe();

// ── Boot ──────────────────────────────────────────────────────────────────────
loadLibrary();
