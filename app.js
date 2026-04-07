// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const bookSelector = document.getElementById('book-selector');
const flipbookContainer = document.getElementById('flipbook');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

let pageFlip = null;
let currentPdf = null;
let pageTextData = []; // This will store the extracted text for searching

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
    } catch (error) {
        console.error("Error loading books.json:", error);
    }
}

// 2. Load the PDF, extract text, and create the flipbook
async function loadPdf(url) {
    // Clear existing book and search data
    flipbookContainer.innerHTML = '';
    pageTextData = []; 
    if (pageFlip) {
        pageFlip.destroy();
    }

    try {
        currentPdf = await pdfjsLib.getDocument(url).promise;
        const totalPages = currentPdf.numPages;
        const pages = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await currentPdf.getPage(pageNum);
            
            // --- NEW: Extract Text for Searching ---
            const textContent = await page.getTextContent();
            // Combine all text items on the page into one searchable string
            const pageText = textContent.items.map(item => item.str).join(' ');
            pageTextData.push(pageText.toLowerCase()); 
            // ---------------------------------------

            // Render the visual canvas
            const viewport = page.getViewport({ scale: 1.5 }); 
            const canvas = document.createElement('canvas');
            canvas.className = 'page';
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const context = canvas.getContext('2d');
            const renderContext = { canvasContext: context, viewport: viewport };
            await page.render(renderContext).promise;
            
            // Wrap canvas in a div for StPageFlip
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page-wrapper';
            pageDiv.appendChild(canvas);
            
            flipbookContainer.appendChild(pageDiv);
            pages.push(pageDiv);
        }

        // Initialize StPageFlip
        pageFlip = new St.PageFlip(flipbookContainer, {
            width: pages[0].querySelector('canvas').width, 
            height: pages[0].querySelector('canvas').height,
            size: "stretch",
            minWidth: 315,
            maxWidth: 1000,
            minHeight: 420,
            maxHeight: 1350,
            maxShadowOpacity: 0.5,
            showCover: true,
            mobileScrollSupport: false,
            usePortrait: true 
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.page-wrapper'));

    } catch (error) {
        console.error("Error loading PDF:", error);
    }
}

// 3. --- NEW: Search Logic ---
searchBtn.addEventListener('click', () => {
    const term = searchInput.value.toLowerCase().trim();
    if (!term || !pageFlip) return;

    // Get the current page we are looking at
    let currentPage = pageFlip.getCurrentPageIndex();
    let found = false;

    // Search forward from the current page
    for (let i = currentPage + 1; i < pageTextData.length; i++) {
         if (pageTextData[i].includes(term)) {
             pageFlip.flip(i); // Turn to the page where it was found
             found = true;
             break;
         }
    }

    // If not found ahead, loop around and search from the beginning up to the current page
    if (!found) {
        for (let i = 0; i <= currentPage; i++) {
            if (pageTextData[i].includes(term)) {
                pageFlip.flip(i);
                found = true;
                break;
            }
        }
    }

    if (!found) {
        alert(`The word "${term}" was not found in this book.`);
    }
});

// Allow hitting "Enter" in the search box to trigger the search
searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// Listen for dropdown changes
bookSelector.addEventListener('change', (e) => {
    if (e.target.value) {
        loadPdf(e.target.value);
    }
});

// Initialize
loadBookList();
