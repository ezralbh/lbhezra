/**
 * Publications Loader
 * Dynamically loads and renders publication cards from JSON data
 */

class PublicationsLoader {
    constructor(containerId = 'publication-grid', dataPath = 'data/publications.json') {
        this.container = document.getElementById(containerId);
        this.dataPath = dataPath;
        this.publications = [];

        if (this.container) {
            this.init();
        }
    }

    async init() {
        this.showLoading();
        await this.loadPublications();
        this.renderPublications();
    }

    showLoading() {
        this.container.innerHTML = `
      <div class="publication-card skeleton">
        <div class="publication-image skeleton-image"></div>
        <div class="publication-body">
          <div class="skeleton-text" style="width: 30%;"></div>
          <div class="skeleton-text" style="width: 90%;"></div>
          <div class="skeleton-text" style="width: 70%;"></div>
        </div>
      </div>
      <div class="publication-card skeleton">
        <div class="publication-image skeleton-image"></div>
        <div class="publication-body">
          <div class="skeleton-text" style="width: 30%;"></div>
          <div class="skeleton-text" style="width: 90%;"></div>
          <div class="skeleton-text" style="width: 70%;"></div>
        </div>
      </div>
      <div class="publication-card skeleton">
        <div class="publication-image skeleton-image"></div>
        <div class="publication-body">
          <div class="skeleton-text" style="width: 30%;"></div>
          <div class="skeleton-text" style="width: 90%;"></div>
          <div class="skeleton-text" style="width: 70%;"></div>
        </div>
      </div>
    `;
    }

    async loadPublications() {
        try {
            const response = await fetch(this.dataPath);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            this.publications = data.publications || [];
        } catch (error) {
            console.error('Error loading publications:', error);
            this.publications = [];
        }
    }

    formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    }

    createPublicationCard(pub) {
        return `
      <article class="publication-card" data-animate>
        <div class="publication-image">
          <img src="${pub.thumbnail}" alt="${pub.title}" onerror="this.src='images/placeholder-news.jpg'">
          <span class="publication-source">${pub.source}</span>
        </div>
        <div class="publication-body">
          <span class="publication-date">${this.formatDate(pub.date)}</span>
          <h4>${pub.title}</h4>
          <p>${pub.excerpt}</p>
          <a href="${pub.url}" target="_blank" rel="noopener noreferrer" class="publication-link">
            Baca Selengkapnya
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </div>
      </article>
    `;
    }

    renderPublications() {
        if (this.publications.length === 0) {
            this.container.innerHTML = `
        <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
          <p style="color: var(--neutral-500);">Belum ada publikasi tersedia.</p>
        </div>
      `;
            return;
        }

        this.container.innerHTML = this.publications
            .map(pub => this.createPublicationCard(pub))
            .join('');

        // Trigger animations
        this.container.querySelectorAll('[data-animate]').forEach((el, index) => {
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PublicationsLoader();
});
