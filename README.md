# 📖 FlipBook Reader

A beautiful, zero-dependency PDF flipbook reader that runs entirely in the browser. Deploy on GitHub Pages with no build step required.

## ✨ Features

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Animated page flip | ✅ Two-page spread with 3D flip | ✅ Single-page swipe |
| PDF rendering | ✅ PDF.js | ✅ PDF.js |
| Word search | ✅ Highlighted results | ✅ Highlighted results |
| Keyboard navigation | ✅ Arrow keys / Space | — |
| Fullscreen | ✅ | ✅ |

## 🗂 Project Structure

```
flipbook-app/
├── index.html        ← Main app (single page)
├── style.css         ← All styles (editorial luxury theme)
├── app.js            ← All JavaScript logic
├── books.inc         ← List of PDFs to show in library
├── data/             ← Put your PDF files here
│   ├── my-book.pdf
│   └── another.pdf
└── README.md
```

## 🚀 Quick Start

### 1. Add your PDFs

Place your PDF files inside the `data/` folder:

```
data/
├── my-awesome-book.pdf
└── research-paper.pdf
```

### 2. Register them in `books.inc`

Edit `books.inc` — one filename per line. Lines starting with `#` are ignored:

```
# My Library
my-awesome-book.pdf
research-paper.pdf
```

### 3. Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **main branch / root**
4. Your reader will be live at `https://yourusername.github.io/your-repo/`

### Running Locally

Because browsers block local file access, use a simple server:

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code: use the Live Server extension
```

Then open `http://localhost:8080`

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` / `Space` | Next page |
| `←` | Previous page |
| `F` | Toggle search |
| `Escape` | Close search / Back to library |
| `Enter` (in search) | Next result |
| `Shift + Enter` | Previous result |

## 📱 Mobile

On mobile devices (screen width ≤ 768px), the reader automatically switches to single-page mode. Navigate by:
- **Swiping left/right** on the page
- Tapping the **← →** arrow buttons

## 🎨 Customisation

The color palette lives in CSS variables at the top of `style.css`:

```css
:root {
  --ink:        #1a1008;   /* Dark background */
  --cream:      #f5efe3;   /* Page color */
  --gold:       #c8973a;   /* Accent */
  --page-bg:    #fdf8f0;   /* PDF page background */
}
```

## 📦 Dependencies (CDN — no install needed)

- [PDF.js 3.11.174](https://mozilla.github.io/pdf.js/) — PDF rendering
- [Google Fonts](https://fonts.google.com/) — Playfair Display + DM Sans

## ⚠️ Notes

- PDFs must be served over HTTP(S) — direct `file://` access is blocked by browsers (CORS).
- Large PDFs load progressively; a loading percentage is shown.
- Search highlights work on text-based PDFs. Scanned image PDFs will not return search results unless OCR'd first.

## License

MIT
