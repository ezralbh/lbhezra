const GalleryLightbox = require('./gallery.js');

describe('GalleryLightbox', () => {
    let galleryLightbox;

    beforeEach(() => {
        // Set up the document body
        document.body.innerHTML = `
            <div class="gallery-item" data-src="test1.jpg">
                <img src="test1.jpg" alt="Image 1">
                <div class="gallery-overlay">
                    <h4>Title 1</h4>
                    <p>Description 1</p>
                </div>
            </div>
            <div class="gallery-item">
                <img src="test2.jpg" alt="Image 2">
                <div class="gallery-overlay">
                    <h4>Title 2</h4>
                    <p>Description 2</p>
                </div>
            </div>
            <div class="gallery-item" data-src="video1.mp4">
                <video src="video1.mp4"></video>
                <div class="gallery-overlay">
                    <h4>Video 1</h4>
                    <p>Description 3</p>
                </div>
            </div>
        `;

        // Mock video play/pause to prevent errors in jsdom
        window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
        window.HTMLMediaElement.prototype.pause = jest.fn();
    });

    afterEach(() => {
        // Clean up the DOM
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize and create lightbox element', () => {
            galleryLightbox = new GalleryLightbox();
            const lightboxElement = document.getElementById('gallery-lightbox');

            expect(galleryLightbox.lightbox).toBe(lightboxElement);
            expect(lightboxElement).toBeTruthy();
            expect(lightboxElement.querySelector('.lightbox-close')).toBeTruthy();
            expect(lightboxElement.querySelector('.lightbox-prev')).toBeTruthy();
            expect(lightboxElement.querySelector('.lightbox-next')).toBeTruthy();
            expect(lightboxElement.querySelector('.lightbox-content')).toBeTruthy();
        });

        test('should bind events to gallery items', () => {
            galleryLightbox = new GalleryLightbox();
            const openSpy = jest.spyOn(galleryLightbox, 'open');

            const firstItem = document.querySelector('.gallery-item');
            firstItem.click();

            expect(openSpy).toHaveBeenCalledWith(0);
        });

        test('should bind events to video elements for hover playback', () => {
             galleryLightbox = new GalleryLightbox();
             const videoItem = document.querySelectorAll('.gallery-item')[2]; // 3rd item is video
             const video = videoItem.querySelector('video');

             // Simulate mouseenter
             const mouseenterEvent = new Event('mouseenter');
             videoItem.dispatchEvent(mouseenterEvent);
             expect(video.play).toHaveBeenCalled();

             // Simulate mouseleave
             const mouseleaveEvent = new Event('mouseleave');
             videoItem.dispatchEvent(mouseleaveEvent);
             expect(video.pause).toHaveBeenCalled();
        });
    });

    describe('Data Collection', () => {
        test('collectImages should parse DOM correctly', () => {
            galleryLightbox = new GalleryLightbox();
            galleryLightbox.collectImages();

            expect(galleryLightbox.images).toHaveLength(3);

            // First item (has data-src)
            expect(galleryLightbox.images[0]).toEqual({
                src: 'test1.jpg',
                type: 'image',
                alt: 'Image 1',
                title: 'Title 1',
                description: 'Description 1'
            });

            // Second item (no data-src, falls back to img src)
            expect(galleryLightbox.images[1]).toEqual({
                src: 'http://localhost/test2.jpg', // jsdom resolves relative urls
                type: 'image',
                alt: 'Image 2',
                title: 'Title 2',
                description: 'Description 2'
            });

            // Third item (video with data-src)
            expect(galleryLightbox.images[2]).toEqual({
                src: 'video1.mp4',
                type: 'video',
                alt: 'Video', // Default alt for video
                title: 'Video 1',
                description: 'Description 3'
            });
        });
    });

    describe('Navigation and UI State', () => {
        beforeEach(() => {
            galleryLightbox = new GalleryLightbox();
        });

        test('open() should show lightbox and set correct image', () => {
            galleryLightbox.open(0);

            expect(galleryLightbox.lightbox.classList.contains('active')).toBe(true);
            expect(document.body.style.overflow).toBe('hidden');
            expect(galleryLightbox.currentIndex).toBe(0);

            const img = galleryLightbox.lightbox.querySelector('.lightbox-content img');
            expect(img.style.display).toBe('block');
            expect(img.src).toContain('test1.jpg'); // Need to use contain due to jsdom path resolution

            const captionTitle = galleryLightbox.lightbox.querySelector('h4');
            expect(captionTitle.textContent).toBe('Title 1');
        });

        test('close() should hide lightbox and resume scrolling', () => {
            galleryLightbox.open(0);
            galleryLightbox.close();

            expect(galleryLightbox.lightbox.classList.contains('active')).toBe(false);
            expect(document.body.style.overflow).toBe('');
        });

        test('next() should advance to the next item and loop back', () => {
            galleryLightbox.open(1); // Start at index 1
            galleryLightbox.next();

            expect(galleryLightbox.currentIndex).toBe(2);

            // Loop back to 0
            galleryLightbox.next();
            expect(galleryLightbox.currentIndex).toBe(0);
        });

        test('prev() should go to previous item and loop to end', () => {
            galleryLightbox.open(1); // Start at index 1
            galleryLightbox.prev();

            expect(galleryLightbox.currentIndex).toBe(0);

            // Loop back to end
            galleryLightbox.prev();
            expect(galleryLightbox.currentIndex).toBe(2);
        });

        test('updateImage() should handle video items correctly', () => {
            galleryLightbox.open(2); // Index 2 is a video

            const img = galleryLightbox.lightbox.querySelector('.lightbox-content img');
            const video = galleryLightbox.lightbox.querySelector('.lightbox-content video');

            expect(img.style.display).toBe('none');
            expect(video.style.display).toBe('block');
            expect(video.src).toContain('video1.mp4');
            expect(video.play).toHaveBeenCalled();
        });

        test('Keyboard navigation should work when lightbox is active', () => {
            galleryLightbox.open(1);

            // Escape to close
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);
            expect(galleryLightbox.lightbox.classList.contains('active')).toBe(false);

            // Open again and test arrow keys
            galleryLightbox.open(1);

            const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
            document.dispatchEvent(rightEvent);
            expect(galleryLightbox.currentIndex).toBe(2);

            const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
            document.dispatchEvent(leftEvent);
            expect(galleryLightbox.currentIndex).toBe(1);
        });

        test('Keyboard navigation should do nothing when lightbox is inactive', () => {
            galleryLightbox = new GalleryLightbox();
            const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
            document.dispatchEvent(rightEvent);
            expect(galleryLightbox.currentIndex).toBe(0); // Should not change
        });

        test('Clicking outside lightbox content should close it', () => {
            galleryLightbox.open(0);

            // Click on the lightbox background
            const clickEvent = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'target', { value: galleryLightbox.lightbox });
            galleryLightbox.lightbox.dispatchEvent(clickEvent);

            expect(galleryLightbox.lightbox.classList.contains('active')).toBe(false);
        });
    });
});
