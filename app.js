const bookSelector = document.getElementById('book-selector');
let myFlipBook = null;

// 1. Fetch the list of books on load
async function loadBookList() {
    try {
        const response = await fetch('books.json');
        const books = await response.json();
        
        books.forEach(book => {
            const option = document.createElement('option');
            option.value = `data/${book.file}`;
            option.textContent = book.title;
            bookSelector.appendChild(option);
        });

        // Auto-load the first book
        if (books.length > 0) {
            const firstBookUrl = `data/${books[0].file}`;
            bookSelector.value = firstBookUrl; 
            loadPdf(firstBookUrl); 
        }

    } catch (error) {
        console.error("Error loading books.json:", error);
    }
}

// 2. Load the PDF using dearFlip
function loadPdf(url) {
    // If a book is already open, we need to empty the container before making a new one
    if (myFlipBook) {
        $('#flipbook').empty();
    }

    // dearFlip Configuration Options
    const options = {
        webgl: true,           // Force true 3D WebGL physics
        soundEnable: true,     // Use dearFlip's native paper-flip sound
        backgroundColor: "transparent", // Use our CSS background
        height: "100%",        // Fit the container we made in CSS
        
        // Responsive behavior: auto-switches to single page on small screens
        singlePageMode: DFLIP.SINGLE_PAGE_MODE.AUTO 
    };

    // Initialize the new book (Requires jQuery syntax)
    myFlipBook = $("#flipbook").flipBook(url, options);
}

// Listen for dropdown changes
bookSelector.addEventListener('change', (e) => {
    if (e.target.value) {
        loadPdf(e.target.value);
    }
});

// Start the app
loadBookList();
