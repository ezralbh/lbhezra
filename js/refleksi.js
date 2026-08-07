/**
 * Refleksi Loader
 * Dynamically loads and renders refleksi articles from JSON data
 */

class RefleksiLoader {
    constructor(listContainerId = 'refleksi-grid', dataPath = 'data/refleksi.json') {
        this.listContainer = document.getElementById(listContainerId);
        this.dataPath = dataPath;
        this.articles = [];

        // Check if we are viewing a single article or the list
        const urlParams = new URLSearchParams(window.location.search);
        this.articleId = urlParams.get('id');

        this.init();
    }

    async init() {
        if (this.listContainer && !this.articleId) {
            this.showLoading();
        }
        await this.loadArticles();

        if (this.articleId) {
            this.renderSingleArticle();
        } else if (this.listContainer) {
            this.renderList();
        }
    }

    showLoading() {
        this.listContainer.innerHTML = `
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

    async loadArticles() {
        try {
            const response = await fetch(this.dataPath);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            this.articles = data.refleksi || [];
        } catch (error) {
            console.error('Error loading refleksi:', error);
            this.articles = [];
        }
    }

    formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    }

    createArticleCard(article) {
        return `
      <article class="publication-card" data-animate>
        <div class="publication-image">
          <img src="${article.thumbnail}" alt="${article.title}" onerror="this.src='images/placeholder-news.jpg'">
          <span class="publication-source">${article.author}</span>
        </div>
        <div class="publication-body">
          <span class="publication-date">${this.formatDate(article.date)}</span>
          <h4>${article.title}</h4>
          <p>${article.excerpt}</p>
          <a href="?id=${article.id}" class="publication-link">
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

    renderList() {
        document.getElementById('list-view').classList.add('active');
        document.getElementById('article-view').classList.remove('active');

        if (this.articles.length === 0) {
            this.listContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
          <p style="color: var(--neutral-500);">Belum ada tulisan tersedia.</p>
        </div>
      `;
            return;
        }

        this.listContainer.innerHTML = this.articles
            .map(article => this.createArticleCard(article))
            .join('');

        // Trigger animations
        this.listContainer.querySelectorAll('[data-animate]').forEach((el, index) => {
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    renderSingleArticle() {
        const article = this.articles.find(a => a.id === this.articleId);

        if (!article) {
            document.getElementById('article-view').innerHTML = `
                <div style="text-align:center; padding:5rem 0;">
                    <h2>Tulisan tidak ditemukan</h2>
                    <a href="refleksi.html" class="btn btn-primary" style="margin-top:2rem;">Kembali ke Daftar Tulisan</a>
                </div>
            `;
        } else {
            document.getElementById('article-title').textContent = article.title;
            document.getElementById('article-meta').innerHTML = `Oleh <strong>${article.author}</strong> | ${this.formatDate(article.date)}`;

            const thumbEl = document.getElementById('article-thumbnail');
            if (article.thumbnail) {
                thumbEl.src = article.thumbnail;
                thumbEl.style.display = 'block';
            } else {
                thumbEl.style.display = 'none';
            }

            // Convert simple newlines to paragraphs for content
            const formattedContent = article.content.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
            document.getElementById('article-body').innerHTML = formattedContent;

            // Hide main header container for reading view
            const headerContainer = document.getElementById('page-header-container');
            if (headerContainer) headerContainer.style.display = 'none';

            // Update document title
            document.title = `${article.title} - Refleksi Hukum LBH EZRA`;
        }

        document.getElementById('list-view').classList.remove('active');
        document.getElementById('article-view').classList.add('active');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new RefleksiLoader();
});
