/**
 * LBH EZRA - Gallery Loader
 * Dynamically loads gallery items from data/gallery.json
 */

class GalleryLoader {
    constructor(containerId = 'gallery-grid', dataPath = 'data/gallery.json') {
        this.container = document.getElementById(containerId);
        this.dataPath = dataPath;
        this.galleryItems = [];

        if (this.container) {
            this.init();
        }
    }

    async init() {
        this.showLoading();
        await this.loadGallery();
        this.renderGallery();
        // Initialize lightbox after gallery is rendered
        if (typeof GalleryLightbox !== 'undefined') {
            new GalleryLightbox();
        }
    }

    showLoading() {
        this.container.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            this.container.innerHTML += `
                <div class="gallery-item skeleton" style="aspect-ratio: 4/3; border-radius: var(--radius-xl);"></div>
            `;
        }
    }

    async loadGallery() {
        try {
            const response = await fetch(this.dataPath);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            this.galleryItems = data.gallery || [];
        } catch (error) {
            console.error('Error loading gallery:', error);
            this.galleryItems = [];
        }
    }

    createGalleryItem(item) {
        const isVideo = item.type === 'video' || item.src.toLowerCase().endsWith('.mp4');

        if (isVideo) {
            return `
                <div class="gallery-item" data-src="${item.src}">
                    <video src="${item.src}" muted loop playsinline></video>
                    <div class="gallery-overlay">
                        <span>Lihat Video</span>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="gallery-item" data-src="${item.src}">
                    <img src="${item.src}" alt="${item.alt || 'Galeri LBH EZRA'}" onerror="this.src='images/placeholder-news.jpg'">
                    <div class="gallery-overlay">
                        <span>Lihat Foto</span>
                    </div>
                </div>
            `;
        }
    }

    renderGallery() {
        if (this.galleryItems.length === 0) {
            this.container.innerHTML = `
                <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                    <p style="color: var(--neutral-500);">Belum ada dokumentasi tersedia.</p>
                </div>
            `;
            return;
        }

        this.container.innerHTML = this.galleryItems
            .map(item => this.createGalleryItem(item))
            .join('');

        // Add hover-to-play behavior for videos
        this.container.querySelectorAll('.gallery-item').forEach(item => {
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

        // Trigger animations
        this.container.querySelectorAll('.gallery-item').forEach((el, index) => {
            el.style.opacity = '0';
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
                el.classList.add('animate-fade-in-up');
            }, index * 80);
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('gallery-grid')) {
        new GalleryLoader();
    }
});
