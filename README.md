# 📚 3D Interactive PDF Flipbook

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![jQuery](https://img.shields.io/badge/jquery-%230769AD.svg?style=for-the-badge&logo=jquery&logoColor=white)

A beautiful, responsive, web-based 3D flipbook application that brings static PDFs to life. Built with raw HTML/CSS/JS and powered by the DearFlip library, this app features realistic 3D page curls, dynamic library loading, and a custom mobile-first UI.

## ✨ Features

* **📖 Realistic 3D WebGL Physics:** Enjoy gorgeous, symmetrical page-curl effects that simulate the feel of a physical book.
* **📱 Mobile Optimized:** Automatically detects screen sizes to adjust the viewing experience, with customized render settings to ensure smooth performance on mobile devices.
* **📂 Dynamic Library:** Easily swap between different PDFs using the built-in dropdown selector. The list is populated automatically from a lightweight JSON file.
* **🎨 Custom UI Control:** A minimalist, edge-to-edge reading experience. The default control toolbar is hidden on load to maximize screen real estate, accessible only via a custom toggle switch.
* **🔒 Clean Interface:** Unnecessary default buttons (like external downloads and outlines) have been forcefully removed for a streamlined, app-like feel.

---

## 🚀 Getting Started

Because this app uses JavaScript's `fetch()` API to read the `books.json` file, **it must be run through a local web server.** Simply double-clicking the `index.html` file in your browser will result in a CORS error.

### 1. Clone the repository
```bash
git clone [https://github.com/zaniestp/pdfflip.git](https://github.com/yourusername/your-repo-name.git)

📦 3D-Flipbook-App
 ┣ 📂 data              # Place all your PDF files in this folder
 ┃ ┗ 📜 PHS_THD_2026.pdf
 ┣ 📜 index.html        # Main HTML skeleton and UI
 ┣ 📜 style.css         # Custom styling and UI overrides
 ┣ 📜 app.js            # Flipbook logic, WebGL settings, and UI toggles
 ┗ 📜 books.json        # Database to populate the dropdown menu

## 📖 **books.json structure**
[
  {
    "title": "PHS THD Programme Booklet 2026",
    "file": "PHS_THD_2026.pdf"
  },
  {
    "title": "My New Awesome Book",
    "file": "new_book.pdf"
  }
]
