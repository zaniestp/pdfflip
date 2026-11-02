/* ------------------------------------------------------------------
   pdfflip — 3D PDF flipbook
   Books are listed in books.json; PDFs live in /data.
   Links can open a specific book and page:
       index.html?book=onedrive-status-icons&page=3
------------------------------------------------------------------- */

const bookSelector = document.getElementById('book-selector');
const flipbookEl   = document.getElementById('flipbook');
const toggleBtn    = document.getElementById('toggle-toolbar-btn');
const shareBtn     = document.getElementById('share-btn');
const toast        = document.getElementById('toast');

let books = [];          // [{ id, title, url }]
let currentBook = null;  // one entry from books
let currentPage = 1;
let flipBook = null;     // live DearFlip instance

/* ---------- small helpers ---------- */

// "OneDrive Status Icons.pdf" -> "onedrive-status-icons"
function slugify(text) {
    return text.replace(/\.pdf$/i, '')
               .toLowerCase()
               .replace(/[^a-z0-9]+/g, '-')
               .replace(/^-|-$/g, '');
}

function showStatus(message, isError = false) {
    flipbookEl.innerHTML = '';
    const div = document.createElement('div');
    div.className = isError ? 'status error' : 'status';
    div.textContent = isError ? `Error: ${message}` : message;  // textContent: never injects HTML
    flipbookEl.appendChild(div);
}

let toastTimer;
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// DearFlip has changed where it keeps the page number between releases, so check the known spots
function readPage(app) {
    const candidates = [app && app._activePage, app && app.target && app.target._activePage,
                        app && app.currentPageNumber, app && app.target && app.target.currentPageNumber];
    const found = candidates.find(n => Number.isInteger(n) && n > 0);
    return found || currentPage;
}

function isNarrowPortrait() {
    return window.innerWidth < 768 && window.innerHeight > window.innerWidth;
}

/* ---------- URL (deep links) ---------- */

function readUrl() {
    const params = new URLSearchParams(location.search);
    const page = parseInt(params.get('page'), 10);
    return { bookId: params.get('book'), page: page > 0 ? page : 1 };
}

function shareableUrl() {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    if (currentBook) {
        url.searchParams.set('book', currentBook.id);
        if (currentPage > 1) url.searchParams.set('page', currentPage);
    }
    return url.toString();
}

function updateUrl() {
    // replaceState: flipping pages shouldn't flood the Back button history
    history.replaceState(null, '', shareableUrl());
    if (currentBook) document.title = `${currentBook.title} · SHPS Flipbooks`;
}

/* ---------- loading ---------- */

async function loadBookList() {
    try {
        const response = await fetch('books.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error("Couldn't read books.json. Check that the file exists and is named exactly 'books.json'.");

        const raw = await response.json();
        if (!Array.isArray(raw) || raw.length === 0) throw new Error('books.json has no books in it.');

        books = raw
            .filter(b => b && b.file)
            .map(b => ({
                id: b.id || slugify(b.file),
                title: b.title || b.file.replace(/\.pdf$/i, ''),
                // encodeURIComponent handles spaces and symbols in file names
                url: `data/${encodeURIComponent(b.file)}`
            }));

        bookSelector.innerHTML = '';
        books.forEach(book => {
            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = book.title;
            bookSelector.appendChild(option);
        });
        bookSelector.disabled = books.length < 2;  // nothing to choose if there's only one

        // Open the book named in the link, otherwise the first one
        const { bookId, page } = readUrl();
        const start = books.find(b => b.id === bookId) || books[0];
        openBook(start, start.id === bookId ? page : 1);
    } catch (error) {
        bookSelector.innerHTML = '<option value="">No books</option>';
        showStatus(error.message, true);
    }
}

function destroyFlipBook() {
    if (flipBook && typeof flipBook.dispose === 'function') {
        try { flipBook.dispose(); } catch (e) { /* already gone */ }
    }
    flipBook = null;
    $(flipbookEl).empty();
}

function openBook(book, startPage = 1) {
    if (typeof $ === 'undefined' || typeof $.fn.flipBook !== 'function') {
        showStatus("The flipbook library didn't load. Check your internet connection, or whether a school filter is blocking cdn.jsdelivr.net, then refresh.", true);
        return;
    }

    destroyFlipBook();
    showStatus(`Loading ${book.title}…`);

    currentBook = book;
    currentPage = startPage;
    bookSelector.value = book.id;
    shareBtn.disabled = false;
    updateUrl();

    const options = {
        webgl: true,
        soundEnable: true,
        soundFile: 'flip.mp3',             // the page-turn sound in this repo
        backgroundColor: 'transparent',
        height: '100%',
        // Phones held upright: one page at a time, so portrait pages are readable.
        // Otherwise let DearFlip choose. (pageMode 1 = single, singlePageMode 2 = booklet flip)
        pageMode: isNarrowPortrait() ? 1 : null,
        singlePageMode: isNarrowPortrait() ? 2 : null,
        pdfRenderQuality: 0.8,
        openPage: startPage,
        hideControls: 'download,outline',
        onFlip: app => {
            currentPage = readPage(app);
            updateUrl();
        },
        onReady: app => {
            currentPage = readPage(app);
            updateUrl();
        }
    };

    try {
        // Clear the "Loading…" text just before DearFlip draws into the container
        flipbookEl.innerHTML = '';
        flipBook = $(flipbookEl).flipBook(book.url, options);
    } catch (error) {
        showStatus(`DearFlip couldn't open this PDF. ${error.message}`, true);
    }
}

/* ---------- controls ---------- */

bookSelector.addEventListener('change', e => {
    const book = books.find(b => b.id === e.target.value);
    if (book) openBook(book, 1);
});

function setToolbar(visible) {
    flipbookEl.classList.toggle('hide-toolbar', !visible);
    toggleBtn.setAttribute('aria-pressed', String(visible));
    const label = visible ? 'Hide toolbar' : 'Show toolbar';
    toggleBtn.setAttribute('aria-label', label);
    toggleBtn.title = `${label} (T)`;
}

toggleBtn.addEventListener('click', () => {
    setToolbar(flipbookEl.classList.contains('hide-toolbar'));
});

// Press T to toggle the toolbar (ignored while typing in a field)
document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 't' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    toggleBtn.click();
});

shareBtn.addEventListener('click', async () => {
    const url = shareableUrl();
    const pageNote = currentPage > 1 ? ` (page ${currentPage})` : '';

    // Phones and tablets: use the native share sheet
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        try {
            await navigator.share({ title: currentBook.title, url });
            return;
        } catch (e) {
            if (e.name === 'AbortError') return;  // user closed the sheet
        }
    }

    // Desktop: copy to clipboard
    try {
        await navigator.clipboard.writeText(url);
        showToast(`Link copied${pageNote}`);
    } catch (e) {
        // Clipboard blocked (e.g. not on https) — let the user copy it by hand
        window.prompt('Copy this link:', url);
    }
});

// Rotating a phone switches between single- and double-page layouts; rebuild at the same page
let wasNarrow = isNarrowPortrait();
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const narrow = isNarrowPortrait();
        if (narrow !== wasNarrow && currentBook) {
            wasNarrow = narrow;
            openBook(currentBook, currentPage);
        }
    }, 300);
});

// Back/Forward between different shared links
window.addEventListener('popstate', () => {
    const { bookId, page } = readUrl();
    const book = books.find(b => b.id === bookId);
    if (book && book !== currentBook) openBook(book, page);
});

document.addEventListener('DOMContentLoaded', loadBookList);
