/**
 * LBH EZRA - Gallery Lightbox
 * Handles gallery display and lightbox functionality
 */

class GalleryLightbox {
    constructor() {
        this.currentIndex = 0;
        this.images = [];
        this.lightbox = null;
        this.init();
    }

    init() {
        this.createLightbox();
        this.bindEvents();
    }

    createLightbox() {
        // Create lightbox HTML
        const lightboxHTML = `
      <div class="lightbox" id="gallery-lightbox">
        <button class="lightbox-close" aria-label="Close">&times;</button>
        <button class="lightbox-nav lightbox-prev" aria-label="Previous">&#10094;</button>
        <div class="lightbox-content">
          <img src="" alt="" style="display: none;">
          <video src="" controls style="display: none; max-width: 100%; max-height: 80vh; margin: auto;"></video>
          <div class="lightbox-caption">
            <h4></h4>
            <p></p>
          </div>
        </div>
        <button class="lightbox-nav lightbox-next" aria-label="Next">&#10095;</button>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', lightboxHTML);
        this.lightbox = document.getElementById('gallery-lightbox');
    }

    bindEvents() {
        // Gallery item clicks
        document.querySelectorAll('.gallery-item').forEach((item, index) => {
            item.addEventListener('click', () => this.open(index));

            // Hover to play video thumbnails
            const video = item.querySelector('video');
            if (video) {
                item.addEventListener('mouseenter', () => {
                    video.play().catch(e => console.log('Play prevented:', e));
                });
                item.addEventListener('mouseleave', () => {
                    video.pause();
                });
            }
        });

        // Close button
        this.lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.close());

        // Navigation
        this.lightbox.querySelector('.lightbox-prev').addEventListener('click', () => this.prev());
        this.lightbox.querySelector('.lightbox-next').addEventListener('click', () => this.next());

        // Click outside to close
        this.lightbox.addEventListener('click', (e) => {
            if (e.target === this.lightbox) {
                this.close();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.lightbox.classList.contains('active')) return;

            switch (e.key) {
                case 'Escape':
                    this.close();
                    break;
                case 'ArrowLeft':
                    this.prev();
                    break;
                case 'ArrowRight':
                    this.next();
                    break;
            }
        });
    }

    collectImages() {
        this.images = [];
        document.querySelectorAll('.gallery-item').forEach(item => {
            const img = item.querySelector('img');
            const video = item.querySelector('video');
            const overlay = item.querySelector('.gallery-overlay');
            
            let src = item.getAttribute('data-src');
            if (!src) {
                src = img ? img.src : (video ? video.src : '');
            }
            
            const isVideo = src.toLowerCase().endsWith('.mp4');

            this.images.push({
                src: src,
                type: isVideo ? 'video' : 'image',
                alt: img ? img.alt : 'Video',
                title: overlay?.querySelector('h4')?.textContent || '',
                description: overlay?.querySelector('p')?.textContent || ''
            });
        });
    }

    open(index) {
        this.collectImages();
        this.currentIndex = index;
        this.updateImage();
        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.lightbox.classList.remove('active');
        document.body.style.overflow = '';
        const video = this.lightbox.querySelector('.lightbox-content video');
        if (video) {
            video.pause();
        }
    }

    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.updateImage();
    }

    next() {
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.updateImage();
    }

    updateImage() {
        const item = this.images[this.currentIndex];
        const img = this.lightbox.querySelector('.lightbox-content img');
        const video = this.lightbox.querySelector('.lightbox-content video');
        const caption = this.lightbox.querySelector('.lightbox-caption');

        // Stop current video if playing
        video.pause();
        video.src = '';

        if (item.type === 'video') {
            img.style.display = 'none';
            video.style.display = 'block';
            video.src = item.src;
            video.play().catch(e => console.log('Autoplay prevented:', e));
        } else {
            video.style.display = 'none';
            img.style.display = 'block';
            img.src = item.src;
            img.alt = item.alt;
        }

        const h4 = caption.querySelector('h4');
        const p = caption.querySelector('p');
        
        if (h4) h4.textContent = item.title;
        if (p) p.textContent = item.description;
    }
}

// GalleryLightbox is initialized by gallery-loader.js after dynamic content is rendered.
// For standalone use without gallery-loader, uncomment below:
// document.addEventListener('DOMContentLoaded', () => {
//     if (document.querySelector('.gallery-item')) {
//         new GalleryLightbox();
//     }
// });
