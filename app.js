const bookSelector = document.getElementById('book-selector');
const flipbookContainer = document.getElementById('flipbook');
let myFlipBook = null;

// Helper function to print errors to your phone screen
function showError(message) {
    flipbookContainer.innerHTML = `<div style="color: #ff6b6b; padding: 20px; font-weight: bold; font-size: 18px; text-align: center;">Error: ${message}</div>`;
}

async function loadBookList() {
    try {
        flipbookContainer.innerHTML = "<div style='color: white; padding: 20px; text-align: center;'>Loading book list...</div>";
        
        const response = await fetch('books.json');
        if (!response.ok) {
            throw new Error(`Failed to read books.json. Check that the file exists and is named exactly 'books.json'.`);
        }
        
        const books = await response.json();
        
        // Clear out options to prevent duplicates
        bookSelector.innerHTML = '<option value="">Select a book...</option>';
        
        books.forEach(book => {
            const option = document.createElement('option');
            option.value = `data/${book.file}`;
            option.textContent = book.title;
            bookSelector.appendChild(option);
        });

        if (books.length > 0) {
            const firstBookUrl = `data/${books[0].file}`;
            bookSelector.value = firstBookUrl; 
            loadPdf(firstBookUrl); 
        } else {
            showError("books.json is empty.");
        }
    } catch (error) {
        showError(error.message);
    }
}

function loadPdf(url) {
    // SECURITY/TIMING CHECK: Make sure DearFlip actually loaded before trying to use it!
    if (typeof $.fn.flipBook !== "function") {
        showError("The DearFlip library was blocked by your browser or hasn't finished downloading. Try refreshing the page.");
        return;
    }

    if (myFlipBook) {
        $('#flipbook').empty();
    }

    // Set a loading message for the PDF
    flipbookContainer.innerHTML = "<div style='color: white; padding: 20px; text-align: center;'>Loading PDF...</div>";

    const options = {
        webgl: false, 
        soundEnable: true,
        backgroundColor: "transparent",
        height: "100%",
        singlePageMode: 0 
    };

    try {
        myFlipBook = $("#flipbook").flipBook(url, options);
    } catch (error) {
        showError("DearFlip failed to load. " + error.message);
    }
}

bookSelector.addEventListener('change', (e) => {
    if (e.target.value) {
        loadPdf(e.target.value);
    }
});

// FIXED: Wait until the whole page and all external scripts finish loading before starting!
window.addEventListener('load', () => {
    loadBookList();
});
