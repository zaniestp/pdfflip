# 📚 3D Interactive PDF Flipbook

🌍 **Live site:** https://zaniestp.github.io/pdfflip/

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![jQuery](https://img.shields.io/badge/jquery-%230769AD.svg?style=for-the-badge&logo=jquery&logoColor=white)

A responsive, web-based 3D flipbook that brings static PDFs to life. Built with plain HTML/CSS/JS and powered by the DearFlip library, with realistic page curls, a book library, and links that open straight to a page.

## ✨ Features

* **📖 Realistic 3D page turns** using WebGL, with a page-flip sound.
* **📱 Phone friendly:** on a phone held upright, pages show one at a time so portrait guides stay readable. Rotate to landscape for the two-page spread.
* **🔗 Share a page:** the link button copies a link that opens the current book at the current page (on phones it opens the share sheet). The address bar always shows the current book and page too.
* **📂 Book library:** switch between PDFs from the dropdown, populated from `books.json`.
* **🎨 Clean view:** the DearFlip toolbar is hidden until you press the toolbar button (or the **T** key). Download and outline buttons are removed.

## 🔗 Linking to a book or page

```
https://zaniestp.github.io/pdfflip/?book=onedrive-status-icons
https://zaniestp.github.io/pdfflip/?book=onedrive-hidden-guide&page=7
```

The `book` value is the PDF file name in lowercase with spaces and symbols turned into dashes (`OneDrive Status Icons.pdf` → `onedrive-status-icons`). To fix a link name so it survives a file rename, add an `id` in `books.json`.

## 📖 books.json

```json
[
  { "title": "SHPS little hidden book of OD", "file": "OneDrive-Hidden-Guide.pdf" },
  { "title": "OneDrive Status Icons", "file": "OneDrive Status Icons.pdf", "id": "status-icons" }
]
```

| Field   | Required | What it does |
|---------|----------|--------------|
| `file`  | ✅ | PDF file name inside `/data` (spaces are fine) |
| `title` | — | Name shown in the dropdown (defaults to the file name) |
| `id`    | — | Name used in links (defaults to the file name, slugified) |

The first book in the list opens by default.

## ➕ Adding a book

1. Upload the PDF to the `data` folder.
2. Add a line for it in `books.json`.
3. Commit. GitHub Pages updates in a minute or two.

## 🚀 Running it locally

The app reads `books.json` with `fetch()`, so it must be served by a web server. Double-clicking `index.html` won't work.

```bash
git clone https://github.com/zaniestp/pdfflip.git
cd pdfflip
python -m http.server 8000
# then open http://localhost:8000
```

## 📦 Files

```
pdfflip
 ┣ 📂 data          PDF files
 ┣ 📜 index.html    Page layout
 ┣ 📜 style.css     Styling and DearFlip overrides
 ┣ 📜 app.js        Library loading, links, toolbar and share button
 ┣ 📜 books.json    The book list
 ┗ 📜 flip.mp3      Page-turn sound
```

## 🛠 Notes

* DearFlip is pinned to **v1.7.3** and jQuery to **3.7.1** in `index.html`, so a new library release can't change the site without you choosing to upgrade.
* Everything loads from `cdn.jsdelivr.net` and `code.jquery.com`. If a network filter blocks those, the page shows an error message telling you so.
