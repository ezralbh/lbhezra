/**
 * LBH EZRA - Admin Panel
 * GitHub API integration for content management
 */

// ===== GitHub API Helper =====
class GitHubAPI {
    constructor(token, owner = 'johnshean', repo = 'johnshean.github.io') {
        this.token = token;
        this.owner = owner;
        this.repo = repo;
        this.baseURL = `https://api.github.com/repos/${owner}/${repo}`;
    }

    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
        const res = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `GitHub API error: ${res.status}`);
        }
        return res.status === 204 ? null : res.json();
    }

    async getFile(path) {
        try {
            return await this.request(`/contents/${path}`);
        } catch { return null; }
    }

    async putFile(path, content, message, sha = null) {
        const body = { message, content: btoa(unescape(encodeURIComponent(content))) };
        if (sha) body.sha = sha;
        return this.request(`/contents/${path}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    async putBinaryFile(path, base64Content, message, sha = null) {
        const body = { message, content: base64Content };
        if (sha) body.sha = sha;
        return this.request(`/contents/${path}`, { method: 'PUT', body: JSON.stringify(body) });
    }

    async validate() {
        return this.request('');
    }
}

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 4000);
}

// ===== Modal Helper =====
function openModal(id) { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

// ===== Main Admin App =====
class AdminApp {
    constructor() {
        this.github = null;
        this.publications = [];
        this.gallery = [];
        this.siteConfig = {};
        this.pubSha = null;
        this.gallerySha = null;
        this.configSha = null;
        this.pendingFiles = {};
        this.init();
    }

    async init() {
        this.bindNavigation();
        this.bindSidebarMobile();

        // Always load local data first so existing content is visible
        await this.loadLocalData();

        const token = localStorage.getItem('lbh_github_token');
        if (token) {
            this.connectGitHub(token);
        } else {
            // Show dashboard with local data even without GitHub
            this.showPage('dashboard');
            document.querySelector('.sidebar-link[data-page="dashboard"]')?.classList.add('active');
        }
    }

    // Load data directly from local JSON files (no GitHub needed)
    async loadLocalData() {
        try {
            const [pubRes, galRes, cfgRes] = await Promise.allSettled([
                fetch('data/publications.json').then(r => r.ok ? r.json() : null),
                fetch('data/gallery.json').then(r => r.ok ? r.json() : null),
                fetch('data/site-config.json').then(r => r.ok ? r.json() : null)
            ]);

            if (pubRes.status === 'fulfilled' && pubRes.value) {
                this.publications = pubRes.value.publications || [];
            }
            if (galRes.status === 'fulfilled' && galRes.value) {
                this.gallery = galRes.value.gallery || [];
            }
            if (cfgRes.status === 'fulfilled' && cfgRes.value) {
                this.siteConfig = cfgRes.value;
            }

            this.renderDashboard();
            this.renderPublications();
            this.renderGallery();
            this.renderSettings();
        } catch (e) {
            console.warn('Gagal memuat data lokal:', e);
        }
    }

    // Navigation
    bindNavigation() {
        document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
            link.addEventListener('click', () => {
                const page = link.dataset.page;
                this.showPage(page);
                document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                // Close mobile sidebar
                document.querySelector('.admin-sidebar')?.classList.remove('open');
                document.querySelector('.sidebar-overlay')?.classList.remove('open');
            });
        });
    }

    bindSidebarMobile() {
        const toggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.admin-sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (toggle) {
            toggle.addEventListener('click', () => { sidebar?.classList.toggle('open'); overlay?.classList.toggle('open'); });
        }
        if (overlay) {
            overlay.addEventListener('click', () => { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); });
        }
    }

    showPage(pageId) {
        document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${pageId}`)?.classList.add('active');
        const titles = { dashboard: 'Dashboard', publications: 'Kelola Publikasi', gallery: 'Kelola Galeri', settings: 'Pengaturan Website', setup: 'Setup' };
        const topTitle = document.getElementById('topbar-title');
        if (topTitle) topTitle.textContent = titles[pageId] || 'Admin';
    }

    // GitHub Connection
    async connectGitHub(token) {
        try {
            this.github = new GitHubAPI(token);
            await this.github.validate();
            localStorage.setItem('lbh_github_token', token);
            this.updateConnectionStatus(true);
            await this.loadGitHubData();
            this.showPage('dashboard');
            document.querySelector('.sidebar-link[data-page="dashboard"]')?.classList.add('active');
            showToast('Terhubung ke GitHub!', 'success');
        } catch (e) {
            showToast('Token tidak valid: ' + e.message, 'error');
            // Still show dashboard with local data
            this.showPage('dashboard');
            document.querySelector('.sidebar-link[data-page="dashboard"]')?.classList.add('active');
        }
    }

    updateConnectionStatus(connected) {
        const dot = document.getElementById('connection-dot');
        const text = document.getElementById('connection-text');
        if (dot) dot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
        if (text) text.textContent = connected ? 'Terhubung' : 'Tidak Terhubung';
    }

    // Load data from GitHub API (updates SHA for publishing)
    async loadGitHubData() {
        try {
            // Load publications
            const pubFile = await this.github.getFile('data/publications.json');
            if (pubFile) {
                this.pubSha = pubFile.sha;
                const data = JSON.parse(decodeURIComponent(escape(atob(pubFile.content.replace(/\n/g, '')))));
                this.publications = data.publications || [];
            }

            // Load gallery
            const galFile = await this.github.getFile('data/gallery.json');
            if (galFile) {
                this.gallerySha = galFile.sha;
                const data = JSON.parse(decodeURIComponent(escape(atob(galFile.content.replace(/\n/g, '')))));
                this.gallery = data.gallery || [];
            }

            // Load site config
            const cfgFile = await this.github.getFile('data/site-config.json');
            if (cfgFile) {
                this.configSha = cfgFile.sha;
                this.siteConfig = JSON.parse(decodeURIComponent(escape(atob(cfgFile.content.replace(/\n/g, '')))));
            }

            this.renderDashboard();
            this.renderPublications();
            this.renderGallery();
            this.renderSettings();
        } catch (e) {
            showToast('Gagal memuat data dari GitHub: ' + e.message, 'error');
        }
    }

    // ===== Dashboard =====
    renderDashboard() {
        const el = (id) => document.getElementById(id);
        if (el('stat-publications')) el('stat-publications').textContent = this.publications.length;
        if (el('stat-gallery')) el('stat-gallery').textContent = this.gallery.length;
        if (el('stat-videos')) el('stat-videos').textContent = this.gallery.filter(g => g.type === 'video').length;
    }

    // ===== Publications Management =====
    renderPublications() {
        const tbody = document.getElementById('publications-tbody');
        if (!tbody) return;

        if (this.publications.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>Belum ada publikasi</p></td></tr>';
            return;
        }

        tbody.innerHTML = this.publications.map((pub, i) => `
            <tr>
                <td><img src="${pub.thumbnail}" class="table-thumb" onerror="this.style.display='none'"></td>
                <td style="max-width:250px;"><strong style="display:block;margin-bottom:2px;">${this.escHTML(pub.title)}</strong><span style="color:var(--admin-text-dim);font-size:0.8rem;">${this.escHTML(pub.source)}</span></td>
                <td style="white-space:nowrap;">${this.formatDate(pub.date)}</td>
                <td><a href="${pub.url}" target="_blank" style="color:var(--admin-primary);font-size:0.8rem;">Buka &rarr;</a></td>
                <td><div class="table-actions">
                    <button class="btn-ghost-admin btn-sm" onclick="app.editPublication(${i})" title="Edit">✏️</button>
                    <button class="btn-ghost-admin btn-sm" onclick="app.deletePublication(${i})" title="Hapus">🗑️</button>
                </div></td>
            </tr>
        `).join('');
    }

    openAddPublication() {
        this.clearPubForm();
        document.getElementById('pub-modal-title').textContent = 'Tambah Publikasi';
        document.getElementById('pub-edit-index').value = '-1';
        openModal('pub-modal');
    }

    editPublication(index) {
        const pub = this.publications[index];
        if (!pub) return;
        document.getElementById('pub-modal-title').textContent = 'Edit Publikasi';
        document.getElementById('pub-edit-index').value = index;
        document.getElementById('pub-title').value = pub.title;
        document.getElementById('pub-source').value = pub.source;
        document.getElementById('pub-date').value = pub.date;
        document.getElementById('pub-url').value = pub.url;
        document.getElementById('pub-excerpt').value = pub.excerpt;
        document.getElementById('pub-thumb-path').value = pub.thumbnail || '';
        openModal('pub-modal');
    }

    clearPubForm() {
        ['pub-title', 'pub-source', 'pub-date', 'pub-url', 'pub-excerpt', 'pub-thumb-path'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.getElementById('pub-edit-index').value = '-1';
        const preview = document.getElementById('pub-file-preview');
        if (preview) preview.innerHTML = '';
        delete this.pendingFiles['pub-thumbnail'];
    }

    savePubForm() {
        const title = document.getElementById('pub-title').value.trim();
        const source = document.getElementById('pub-source').value.trim();
        const date = document.getElementById('pub-date').value;
        const url = document.getElementById('pub-url').value.trim();
        const excerpt = document.getElementById('pub-excerpt').value.trim();
        const thumbPath = document.getElementById('pub-thumb-path').value.trim();

        if (!title || !source || !date || !url) {
            showToast('Mohon isi semua field yang wajib', 'warning');
            return;
        }

        const index = parseInt(document.getElementById('pub-edit-index').value);
        const pub = { title, source, date, url, excerpt, thumbnail: thumbPath || 'images/news/default.jpg' };

        if (index >= 0) {
            this.publications[index] = pub;
        } else {
            this.publications.unshift(pub);
        }

        this.renderPublications();
        this.renderDashboard();
        closeModal('pub-modal');
        showToast('Publikasi disimpan (lokal). Klik "Publish" untuk mengirim ke GitHub.', 'info');
    }

    deletePublication(index) {
        if (!confirm('Hapus publikasi ini?')) return;
        this.publications.splice(index, 1);
        this.renderPublications();
        this.renderDashboard();
        showToast('Publikasi dihapus (lokal). Klik "Publish" untuk mengirim ke GitHub.', 'info');
    }

    async publishPublications() {
        if (!this.github) { showToast('Hubungkan GitHub terlebih dahulu', 'error'); return; }
        const btn = document.getElementById('btn-publish-pub');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Publishing...';
        try {
            // Upload pending thumbnails
            if (this.pendingFiles['pub-thumbnail']) {
                const f = this.pendingFiles['pub-thumbnail'];
                await this.github.putBinaryFile(f.path, f.base64, `Upload thumbnail: ${f.name}`);
                delete this.pendingFiles['pub-thumbnail'];
            }
            // Save JSON
            const content = JSON.stringify({ publications: this.publications }, null, 2);
            const res = await this.github.putFile('data/publications.json', content, 'Update publications via admin panel', this.pubSha);
            this.pubSha = res.content.sha;
            showToast('Publikasi berhasil dipublish ke GitHub!', 'success');
        } catch (e) {
            showToast('Gagal publish: ' + e.message, 'error');
        }
        btn.disabled = false;
        btn.innerHTML = '🚀 Publish ke GitHub';
    }

    // ===== Gallery Management =====
    renderGallery() {
        const grid = document.getElementById('gallery-admin-grid');
        if (!grid) return;

        if (this.gallery.length === 0) {
            grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><p>Belum ada item galeri</p></div>';
            return;
        }

        grid.innerHTML = this.gallery.map((item, i) => {
            const isVideo = item.type === 'video';
            const media = isVideo
                ? `<video src="${item.src}" muted></video><span class="video-badge">VIDEO</span>`
                : `<img src="${item.src}" alt="${this.escHTML(item.alt || '')}" onerror="this.style.background='var(--admin-surface-3)'">`;
            return `
                <div class="gallery-admin-item">
                    ${media}
                    <div class="item-overlay">
                        <button class="btn-ghost-admin" style="color:#fff;" onclick="app.deleteGalleryItem(${i})" title="Hapus">🗑️</button>
                    </div>
                </div>`;
        }).join('');
    }

    openAddGallery() {
        document.getElementById('gallery-file-input').value = '';
        document.getElementById('gallery-alt').value = '';
        document.getElementById('gallery-caption').value = '';
        const preview = document.getElementById('gallery-file-preview');
        if (preview) preview.innerHTML = '';
        delete this.pendingFiles['gallery-media'];
        openModal('gallery-modal');
    }

    deleteGalleryItem(index) {
        if (!confirm('Hapus item galeri ini?')) return;
        this.gallery.splice(index, 1);
        this.renderGallery();
        this.renderDashboard();
        showToast('Item dihapus (lokal). Klik "Publish" untuk mengirim ke GitHub.', 'info');
    }

    saveGalleryForm() {
        const file = this.pendingFiles['gallery-media'];
        if (!file) {
            showToast('Pilih file gambar atau video', 'warning');
            return;
        }
        const alt = document.getElementById('gallery-alt').value.trim() || 'Galeri LBH EZRA';
        const caption = document.getElementById('gallery-caption').value.trim();
        const isVideo = file.name.toLowerCase().endsWith('.mp4');

        this.gallery.push({
            src: file.path,
            type: isVideo ? 'video' : 'image',
            alt,
            caption
        });

        this.renderGallery();
        this.renderDashboard();
        closeModal('gallery-modal');
        showToast('Item ditambahkan (lokal). Klik "Publish" untuk mengirim ke GitHub.', 'info');
    }

    async publishGallery() {
        if (!this.github) { showToast('Hubungkan GitHub terlebih dahulu', 'error'); return; }
        const btn = document.getElementById('btn-publish-gallery');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Publishing...';
        try {
            // Upload pending media
            if (this.pendingFiles['gallery-media']) {
                const f = this.pendingFiles['gallery-media'];
                await this.github.putBinaryFile(f.path, f.base64, `Upload gallery: ${f.name}`);
                delete this.pendingFiles['gallery-media'];
            }
            const content = JSON.stringify({ gallery: this.gallery }, null, 2);
            const res = await this.github.putFile('data/gallery.json', content, 'Update gallery via admin panel', this.gallerySha);
            this.gallerySha = res.content.sha;
            showToast('Galeri berhasil dipublish ke GitHub!', 'success');
        } catch (e) {
            showToast('Gagal publish: ' + e.message, 'error');
        }
        btn.disabled = false;
        btn.innerHTML = '🚀 Publish ke GitHub';
    }

    // ===== Settings =====
    renderSettings() {
        const el = (id) => document.getElementById(id);
        if (el('cfg-whatsapp')) el('cfg-whatsapp').value = this.siteConfig.whatsapp || '';
        if (el('cfg-phone')) el('cfg-phone').value = this.siteConfig.phone || '';
        if (el('cfg-address')) el('cfg-address').value = this.siteConfig.address || '';
        if (el('cfg-hours-weekday')) el('cfg-hours-weekday').value = this.siteConfig.operationalHours?.weekday || '';
        if (el('cfg-hours-weekend')) el('cfg-hours-weekend').value = this.siteConfig.operationalHours?.weekend || '';
    }

    async publishSettings() {
        if (!this.github) { showToast('Hubungkan GitHub terlebih dahulu', 'error'); return; }
        const btn = document.getElementById('btn-publish-settings');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
        try {
            this.siteConfig = {
                whatsapp: document.getElementById('cfg-whatsapp').value.trim(),
                phone: document.getElementById('cfg-phone').value.trim(),
                address: document.getElementById('cfg-address').value.trim(),
                operationalHours: {
                    weekday: document.getElementById('cfg-hours-weekday').value.trim(),
                    weekend: document.getElementById('cfg-hours-weekend').value.trim()
                }
            };
            const content = JSON.stringify(this.siteConfig, null, 2);
            const res = await this.github.putFile('data/site-config.json', content, 'Update site config via admin panel', this.configSha);
            this.configSha = res.content.sha;
            showToast('Pengaturan berhasil disimpan!', 'success');
        } catch (e) {
            showToast('Gagal menyimpan: ' + e.message, 'error');
        }
        btn.disabled = false;
        btn.innerHTML = '💾 Simpan Pengaturan';
    }

    // ===== File Upload Handling =====
    handleFileUpload(inputEl, previewEl, pendingKey, targetDir) {
        const file = inputEl.files[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
        const path = `${targetDir}/${safeName}`;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result.split(',')[1];
            this.pendingFiles[pendingKey] = { name: safeName, path, base64 };

            // Update path input if exists
            const pathInput = document.getElementById(`${pendingKey === 'pub-thumbnail' ? 'pub-thumb-path' : ''}`);
            if (pathInput) pathInput.value = path;

            // Show preview
            const preview = document.getElementById(previewEl);
            if (preview) {
                const isVideo = ['mp4', 'webm'].includes(ext);
                preview.innerHTML = `
                    <div class="file-preview">
                        ${isVideo ? `<video src="${e.target.result}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;"></video>` : `<img src="${e.target.result}">`}
                        <span class="file-preview-name">${safeName}</span>
                        <button class="file-preview-remove" onclick="app.removePendingFile('${pendingKey}','${previewEl}')">&times;</button>
                    </div>`;
            }
        };
        reader.readAsDataURL(file);
    }

    removePendingFile(key, previewId) {
        delete this.pendingFiles[key];
        const preview = document.getElementById(previewId);
        if (preview) preview.innerHTML = '';
    }

    // ===== Utilities =====
    escHTML(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    formatDate(dateStr) {
        try {
            return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return dateStr; }
    }

    disconnect() {
        localStorage.removeItem('lbh_github_token');
        this.github = null;
        this.updateConnectionStatus(false);
        this.showPage('setup');
        showToast('Disconnected dari GitHub', 'info');
    }
}

// Initialize
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AdminApp();
});
