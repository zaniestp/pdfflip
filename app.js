// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const bookSelector = document.getElementById('book-selector');
const flipbookContainer = document.getElementById('flipbook');
let pageFlip = null;
let currentPdf = null;

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

// 2. Load the PDF and create the flipbook
async function loadPdf(url) {
    // Clear existing book
    flipbookContainer.innerHTML = '';
    if (pageFlip) {
        pageFlip.destroy();
    }

    try {
        currentPdf = await pdfjsLib.getDocument(url).promise;
        const totalPages = currentPdf.numPages;
        
        // Create an array to hold all our canvas elements
        const pages = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await currentPdf.getPage(pageNum);
            
            // Adjust scale based on your needs
            const viewport = page.getViewport({ scale: 1.5 }); 
            
            const canvas = document.createElement('canvas');
            canvas.className = 'page';
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const context = canvas.getContext('2d');
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // Wrap canvas in a div for StPageFlip
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page-wrapper';
            pageDiv.appendChild(canvas);
            
            flipbookContainer.appendChild(pageDiv);
            pages.push(pageDiv);
        }

        // 3. Initialize StPageFlip
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
            // Magic setting for responsive: Single page on mobile, Double on PC
            usePortrait: true 
        });

        pageFlip.loadFromHTML(document.querySelectorAll('.page-wrapper'));

    } catch (error) {
        console.error("Error loading PDF:", error);
    }
}

// Listen for dropdown changes
bookSelector.addEventListener('change', (e) => {
    if (e.target.value) {
        loadPdf(e.target.value);
    }
});

// Initialize
loadBookList();
