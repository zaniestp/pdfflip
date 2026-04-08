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
    if (myFlipBook) {
        $('#flipbook').empty();
    }

    // Set a loading message for the PDF
    flipbookContainer.innerHTML = "<div style='color: white; padding: 20px; text-align: center;'>Loading PDF...</div>";

    const options = {
        webgl: false, // Turned OFF for better mobile browser stability
        soundEnable: true,
        backgroundColor: "transparent",
        height: "100%",
        // FIXED: Using 0 instead of DFLIP.SINGLE_PAGE_MODE.AUTO to prevent the undefined error
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

// Start app
loadBookList();
