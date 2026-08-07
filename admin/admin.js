const REPO_OWNER = 'ezralbh';
const REPO_NAME = 'lbhezra';
const BRANCH = 'main'; // Adjust if the default branch is different

const app = {
    token: localStorage.getItem('github_token') || '',
    data: {
        publications: [],
        gallery: [],
        config: {},
        refleksi: []
    },
    shas: {
        publications: '',
        gallery: '',
        config: '',
        refleksi: ''
    },

    init: function() {
        if (this.token) {
            this.showPage('dashboard');
            this.loadAllData();

            const dot = document.getElementById('connection-dot');
            const text = document.getElementById('connection-text');
            if(dot) dot.className = 'status-dot connected';
            if(text) text.innerText = 'Terhubung';
        } else {
            this.showPage('setup');
        }

        // Setup sidebar navigation
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.closest('.sidebar-link').dataset.page;
                this.showPage(page);

                document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
                e.target.closest('.sidebar-link').classList.add('active');
            });
        });

        // Setup sidebar toggle
        const toggle = document.getElementById('sidebar-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                document.querySelector('.admin-sidebar').classList.toggle('active');
            });
        }
    },

    connectGitHub: function(token) {
        if (!token) return alert('Token tidak boleh kosong!');
        this.token = token;
        localStorage.setItem('github_token', token);
        this.showPage('dashboard');
        this.loadAllData();

        const dot = document.getElementById('connection-dot');
        const text = document.getElementById('connection-text');
        if(dot) dot.className = 'status-dot connected';
        if(text) text.innerText = 'Terhubung';
    },

    logout: function() {
        if(confirm('Yakin ingin logout?')) {
            this.token = '';
            localStorage.removeItem('github_token');
            this.showPage('setup');
            document.getElementById('github-token').value = '';

            const dot = document.getElementById('connection-dot');
            const text = document.getElementById('connection-text');
            if(dot) dot.className = 'status-dot disconnected';
            if(text) text.innerText = 'Tidak Terhubung';

            // Clear local data to avoid leaking state
            this.data = { publications: [], gallery: [], config: {}, refleksi: [] };
        }
    },

    showPage: function(pageId) {
        document.querySelectorAll('.admin-page').forEach(page => {
            page.classList.remove('active');
        });
        const pageEl = document.getElementById('page-' + pageId);
        if (pageEl) {
            pageEl.classList.add('active');
        }
    },

    async githubRequest(path, method = 'GET', body = null) {
        const headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`, options);
        if (!res.ok) {
            if (res.status === 404 && method === 'GET') {
                return null; // File not found
            }
            throw new Error(`GitHub API error: ${res.statusText}`);
        }
        return res.json();
    },

    async commitTextFile(path, content, message, sha) {
        const body = {
            message: message,
            content: btoa(unescape(encodeURIComponent(content))),
            branch: BRANCH
        };
        if (sha) body.sha = sha;

        return this.githubRequest(path, 'PUT', body);
    },

    async commitBinaryFile(path, base64content, message, sha) {
        const body = {
            message: message,
            content: base64content,
            branch: BRANCH
        };
        if (sha) body.sha = sha;

        return this.githubRequest(path, 'PUT', body);
    },

    async loadAllData() {
        try {
            // Load Publications
            const pubRes = await this.githubRequest('data/publications.json');
            if (pubRes) {
                this.shas.publications = pubRes.sha;
                const content = decodeURIComponent(escape(atob(pubRes.content)));
                this.data.publications = JSON.parse(content).publications || [];
            }
            this.renderPublications();

            // Load Gallery
            const galRes = await this.githubRequest('data/gallery.json');
            if (galRes) {
                this.shas.gallery = galRes.sha;
                const content = decodeURIComponent(escape(atob(galRes.content)));
                this.data.gallery = JSON.parse(content).gallery || [];
            }
            this.renderGallery();

            // Load Config
            const cfgRes = await this.githubRequest('data/site-config.json');
            if (cfgRes) {
                this.shas.config = cfgRes.sha;
                const content = decodeURIComponent(escape(atob(cfgRes.content)));
                this.data.config = JSON.parse(content);
            }
            this.renderSettings();

            // Load Refleksi
            const refRes = await this.githubRequest('data/refleksi.json');
            if (refRes) {
                this.shas.refleksi = refRes.sha;
                const content = decodeURIComponent(escape(atob(refRes.content)));
                this.data.refleksi = JSON.parse(content).refleksi || [];
            }
            this.renderRefleksi();

            this.updateDashboardStats();

        } catch (error) {
            console.error(error);
            alert('Gagal memuat data dari GitHub. Pastikan token Anda valid dan memiliki izin yang tepat.');
            this.token = '';
            localStorage.removeItem('github_token');
            this.showPage('setup');
        }
    },

    updateDashboardStats: function() {
        document.getElementById('stat-publications').innerText = this.data.publications.length;
        document.getElementById('stat-gallery').innerText = this.data.gallery.length;
        if (document.getElementById('stat-refleksi')) {
            document.getElementById('stat-refleksi').innerText = this.data.refleksi.length;
        }
    },

    // --- Publications ---

    renderPublications: function() {
        const tbody = document.getElementById('publications-tbody');
        if (!tbody) return;

        if (this.data.publications.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>Tidak ada publikasi.</p></td></tr>';
            return;
        }

        tbody.innerHTML = this.data.publications.map((pub, index) => `
            <tr>
                <td><img src="${pub.thumbnail}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;" onerror="this.src='images/placeholder-news.jpg'"></td>
                <td><strong>${pub.title}</strong><br><small>${pub.source}</small></td>
                <td>${pub.date}</td>
                <td><a href="${pub.url}" target="_blank">Link</a></td>
                <td>
                    <button class="btn-admin btn-outline-admin" onclick="app.editPublication(${index})" style="padding:0.25rem 0.5rem;font-size:0.875rem;">Edit</button>
                    <button class="btn-admin btn-outline-admin" onclick="app.deletePublication(${index})" style="padding:0.25rem 0.5rem;font-size:0.875rem;color:red;border-color:red;">Hapus</button>
                </td>
            </tr>
        `).join('');
    },

    openAddPublication: function() {
        document.getElementById('pub-edit-index').value = '-1';
        document.getElementById('pub-title').value = '';
        document.getElementById('pub-source').value = '';
        document.getElementById('pub-date').value = '';
        document.getElementById('pub-url').value = '';
        document.getElementById('pub-excerpt').value = '';
        document.getElementById('pub-thumb-path').value = '';
        document.getElementById('pub-file-preview').innerHTML = '';

        document.getElementById('pub-modal-title').innerText = 'Tambah Publikasi';
        document.getElementById('pub-modal').classList.add('active');
    },

    editPublication: function(index) {
        const pub = this.data.publications[index];
        document.getElementById('pub-edit-index').value = index;
        document.getElementById('pub-title').value = pub.title || '';
        document.getElementById('pub-source').value = pub.source || '';
        document.getElementById('pub-date').value = pub.date || '';
        document.getElementById('pub-url').value = pub.url || '';
        document.getElementById('pub-excerpt').value = pub.excerpt || '';
        document.getElementById('pub-thumb-path').value = pub.thumbnail || '';
        document.getElementById('pub-file-preview').innerHTML = `<img src="${pub.thumbnail}" style="max-width:100%;max-height:150px;border-radius:4px;margin-top:1rem;">`;

        document.getElementById('pub-modal-title').innerText = 'Edit Publikasi';
        document.getElementById('pub-modal').classList.add('active');
    },

    deletePublication: function(index) {
        if (confirm('Yakin ingin menghapus publikasi ini?')) {
            this.data.publications.splice(index, 1);
            this.renderPublications();
            this.updateDashboardStats();
        }
    },

    savePubForm: function() {
        const index = parseInt(document.getElementById('pub-edit-index').value);

        const pub = {
            title: document.getElementById('pub-title').value,
            source: document.getElementById('pub-source').value,
            date: document.getElementById('pub-date').value,
            url: document.getElementById('pub-url').value,
            excerpt: document.getElementById('pub-excerpt').value,
            thumbnail: document.getElementById('pub-thumb-path').value
        };

        if (!pub.title || !pub.source || !pub.date || !pub.url) {
            return alert('Harap isi field yang wajib!');
        }

        if (index === -1) {
            this.data.publications.unshift(pub);
        } else {
            this.data.publications[index] = pub;
        }

        this.renderPublications();
        this.updateDashboardStats();
        closeModal('pub-modal');
    },

    async publishPublications() {
        const btn = document.getElementById('btn-publish-pub');
        const ogText = btn.innerText;
        btn.innerText = 'Menyimpan...';
        btn.disabled = true;

        try {
            const content = JSON.stringify({ publications: this.data.publications }, null, 2);
            const res = await this.commitTextFile('data/publications.json', content, 'Update publications data', this.shas.publications);
            this.shas.publications = res.content.sha;
            alert('Publikasi berhasil di-publish!');
        } catch (e) {
            console.error(e);
            alert('Gagal mem-publish: ' + e.message);
        } finally {
            btn.innerText = ogText;
            btn.disabled = false;
        }
    },

    // --- Refleksi ---

    renderRefleksi: function() {
        const tbody = document.getElementById('refleksi-tbody');
        if (!tbody) return;

        if (this.data.refleksi.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><p>Tidak ada refleksi.</p></td></tr>';
            return;
        }

        tbody.innerHTML = this.data.refleksi.map((ref, index) => `
            <tr>
                <td><img src="${ref.thumbnail}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;" onerror="this.src='images/placeholder-news.jpg'"></td>
                <td><strong>${ref.title}</strong><br><small>${ref.author}</small></td>
                <td>${ref.date}</td>
                <td>
                    <button class="btn-admin btn-outline-admin" onclick="app.editRefleksi(${index})" style="padding:0.25rem 0.5rem;font-size:0.875rem;">Edit</button>
                    <button class="btn-admin btn-outline-admin" onclick="app.deleteRefleksi(${index})" style="padding:0.25rem 0.5rem;font-size:0.875rem;color:red;border-color:red;">Hapus</button>
                </td>
            </tr>
        `).join('');
    },

    openAddRefleksi: function() {
        document.getElementById('ref-edit-index').value = '-1';
        document.getElementById('ref-title').value = '';
        document.getElementById('ref-author').value = '';
        document.getElementById('ref-date').value = '';
        document.getElementById('ref-id').value = '';
        document.getElementById('ref-excerpt').value = '';
        document.getElementById('ref-content').value = '';
        document.getElementById('ref-thumb-path').value = '';
        document.getElementById('ref-file-preview').innerHTML = '';

        document.getElementById('ref-modal-title').innerText = 'Tambah Refleksi Hukum';
        document.getElementById('ref-modal').classList.add('active');
    },

    editRefleksi: function(index) {
        const ref = this.data.refleksi[index];
        document.getElementById('ref-edit-index').value = index;
        document.getElementById('ref-title').value = ref.title || '';
        document.getElementById('ref-author').value = ref.author || '';
        document.getElementById('ref-date').value = ref.date || '';
        document.getElementById('ref-id').value = ref.id || '';
        document.getElementById('ref-excerpt').value = ref.excerpt || '';
        document.getElementById('ref-content').value = ref.content || '';
        document.getElementById('ref-thumb-path').value = ref.thumbnail || '';
        document.getElementById('ref-file-preview').innerHTML = `<img src="${ref.thumbnail}" style="max-width:100%;max-height:150px;border-radius:4px;margin-top:1rem;">`;

        document.getElementById('ref-modal-title').innerText = 'Edit Refleksi Hukum';
        document.getElementById('ref-modal').classList.add('active');
    },

    deleteRefleksi: function(index) {
        if (confirm('Yakin ingin menghapus refleksi ini?')) {
            this.data.refleksi.splice(index, 1);
            this.renderRefleksi();
            this.updateDashboardStats();
        }
    },

    saveRefForm: function() {
        const index = parseInt(document.getElementById('ref-edit-index').value);

        const ref = {
            id: document.getElementById('ref-id').value,
            title: document.getElementById('ref-title').value,
            author: document.getElementById('ref-author').value,
            date: document.getElementById('ref-date').value,
            excerpt: document.getElementById('ref-excerpt').value,
            content: document.getElementById('ref-content').value,
            thumbnail: document.getElementById('ref-thumb-path').value
        };

        if (!ref.title || !ref.author || !ref.date || !ref.id || !ref.content) {
            return alert('Harap isi field yang wajib!');
        }

        if (index === -1) {
            this.data.refleksi.unshift(ref);
        } else {
            this.data.refleksi[index] = ref;
        }

        this.renderRefleksi();
        this.updateDashboardStats();
        closeModal('ref-modal');
    },

    async publishRefleksi() {
        const btn = document.getElementById('btn-publish-ref');
        const ogText = btn.innerText;
        btn.innerText = 'Menyimpan...';
        btn.disabled = true;

        try {
            const content = JSON.stringify({ refleksi: this.data.refleksi }, null, 2);
            const res = await this.commitTextFile('data/refleksi.json', content, 'Update refleksi data', this.shas.refleksi);
            this.shas.refleksi = res.content.sha;
            alert('Refleksi berhasil di-publish!');
        } catch (e) {
            console.error(e);
            alert('Gagal mem-publish: ' + e.message);
        } finally {
            btn.innerText = ogText;
            btn.disabled = false;
        }
    },

    // --- Gallery ---

    renderGallery: function() {
        const grid = document.getElementById('gallery-admin-grid');
        if (!grid) return;

        if (this.data.gallery.length === 0) {
            grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><p>Tidak ada media galeri.</p></div>';
            return;
        }

        grid.innerHTML = this.data.gallery.map((item, index) => `
            <div class="admin-card" style="padding:1rem;">
                ${item.type === 'video'
                    ? `<video src="${item.src}" controls style="width:100%;height:150px;object-fit:cover;border-radius:4px;background:#000;"></video>`
                    : `<img src="${item.src}" style="width:100%;height:150px;object-fit:cover;border-radius:4px;" onerror="this.src='images/placeholder.jpg'">`
                }
                <div style="margin-top:1rem;">
                    <p style="margin:0 0 0.5rem;font-weight:600;font-size:0.875rem;">${item.alt || 'Tanpa Deskripsi'}</p>
                    <button class="btn-admin btn-outline-admin" onclick="app.deleteGallery(${index})" style="width:100%;color:red;border-color:red;">Hapus</button>
                </div>
            </div>
        `).join('');
    },

    openAddGallery: function() {
        document.getElementById('gallery-alt').value = '';
        document.getElementById('gallery-caption').value = '';
        document.getElementById('gallery-file-input').value = '';
        document.getElementById('gallery-file-preview').innerHTML = '';

        // Remove old hidden field if any
        const oldHidden = document.getElementById('gallery-uploaded-path');
        if (oldHidden) oldHidden.remove();
        const oldType = document.getElementById('gallery-uploaded-type');
        if (oldType) oldType.remove();

        document.getElementById('gallery-modal').classList.add('active');
    },

    deleteGallery: function(index) {
        if (confirm('Yakin ingin menghapus media ini dari galeri?')) {
            this.data.gallery.splice(index, 1);
            this.renderGallery();
            this.updateDashboardStats();
        }
    },

    saveGalleryForm: function() {
        const pathInput = document.getElementById('gallery-uploaded-path');
        const typeInput = document.getElementById('gallery-uploaded-type');

        const alt = document.getElementById('gallery-alt').value;
        const caption = document.getElementById('gallery-caption').value;

        if (!pathInput || !pathInput.value) {
            return alert('Harap upload file terlebih dahulu!');
        }

        const item = {
            src: pathInput.value,
            type: typeInput.value,
            alt: alt,
            caption: caption
        };

        this.data.gallery.unshift(item);
        this.renderGallery();
        this.updateDashboardStats();
        closeModal('gallery-modal');
    },

    async publishGallery() {
        const btn = document.getElementById('btn-publish-gallery');
        const ogText = btn.innerText;
        btn.innerText = 'Menyimpan...';
        btn.disabled = true;

        try {
            const content = JSON.stringify({ gallery: this.data.gallery }, null, 2);
            const res = await this.commitTextFile('data/gallery.json', content, 'Update gallery data', this.shas.gallery);
            this.shas.gallery = res.content.sha;
            alert('Galeri berhasil di-publish!');
        } catch (e) {
            console.error(e);
            alert('Gagal mem-publish: ' + e.message);
        } finally {
            btn.innerText = ogText;
            btn.disabled = false;
        }
    },

    // --- Settings ---

    renderSettings: function() {
        const cfg = this.data.config || {};
        document.getElementById('cfg-whatsapp').value = cfg.whatsapp || '';
        document.getElementById('cfg-phone').value = cfg.phone || '';
        document.getElementById('cfg-address').value = cfg.address || '';
        if (cfg.operationalHours) {
            document.getElementById('cfg-hours-weekday').value = cfg.operationalHours.weekday || '';
            document.getElementById('cfg-hours-weekend').value = cfg.operationalHours.weekend || '';
        }
    },

    async publishSettings() {
        const btn = document.getElementById('btn-publish-settings');
        const ogText = btn.innerText;
        btn.innerText = 'Menyimpan...';
        btn.disabled = true;

        const newConfig = {
            whatsapp: document.getElementById('cfg-whatsapp').value,
            phone: document.getElementById('cfg-phone').value,
            address: document.getElementById('cfg-address').value,
            operationalHours: {
                weekday: document.getElementById('cfg-hours-weekday').value,
                weekend: document.getElementById('cfg-hours-weekend').value
            }
        };

        try {
            const content = JSON.stringify(newConfig, null, 2);
            const res = await this.commitTextFile('data/site-config.json', content, 'Update site config', this.shas.config);
            this.shas.config = res.content.sha;
            this.data.config = newConfig;
            alert('Pengaturan berhasil di-publish!');
        } catch (e) {
            console.error(e);
            alert('Gagal mem-publish: ' + e.message);
        } finally {
            btn.innerText = ogText;
            btn.disabled = false;
        }
    },

    // --- File Upload Logic ---

    async handleFileUpload(input, previewId, hiddenIdPrefix, uploadPathPrefix) {
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        const reader = new FileReader();

        const previewEl = document.getElementById(previewId);
        previewEl.innerHTML = '<p style="color:var(--admin-primary);margin-top:1rem;">Membaca file...</p>';

        reader.onload = async (e) => {
            const base64data = e.target.result.split(',')[1];

            // Generate filename based on timestamp to avoid collisions
            const ext = file.name.split('.').pop();
            const fileName = `upload_${Date.now()}.${ext}`;
            const filePath = `${uploadPathPrefix}/${fileName}`;

            previewEl.innerHTML = '<p style="color:var(--admin-primary);margin-top:1rem;">Mengupload ke GitHub...</p>';

            try {
                // Upload to GitHub
                await this.commitBinaryFile(filePath, base64data, `Upload media ${fileName}`, null);

                // Show preview
                const type = file.type.startsWith('video') ? 'video' : 'image';
                if (type === 'video') {
                    previewEl.innerHTML = `<video src="${filePath}" controls style="max-width:100%;max-height:150px;border-radius:4px;margin-top:1rem;"></video>`;
                } else {
                    previewEl.innerHTML = `<img src="${filePath}" style="max-width:100%;max-height:150px;border-radius:4px;margin-top:1rem;">`;
                }

                previewEl.innerHTML += `<p style="color:green;font-size:0.875rem;margin-top:0.5rem;">Upload berhasil: ${filePath}</p>`;

                // Update specific hidden inputs based on which form is uploading
                if (hiddenIdPrefix === 'pub-thumbnail') {
                    const thumbInput = document.getElementById('pub-thumb-path');
                    if (thumbInput) thumbInput.value = filePath;
                } else if (hiddenIdPrefix === 'ref-thumbnail') {
                    const thumbInput = document.getElementById('ref-thumb-path');
                    if (thumbInput) thumbInput.value = filePath;
                } else if (hiddenIdPrefix === 'gallery-media') {
                    // Create hidden inputs for gallery form to store path and type
                    let pathInput = document.getElementById('gallery-uploaded-path');
                    if (!pathInput) {
                        pathInput = document.createElement('input');
                        pathInput.type = 'hidden';
                        pathInput.id = 'gallery-uploaded-path';
                        previewEl.appendChild(pathInput);
                    }
                    pathInput.value = filePath;

                    let typeInput = document.getElementById('gallery-uploaded-type');
                    if (!typeInput) {
                        typeInput = document.createElement('input');
                        typeInput.type = 'hidden';
                        typeInput.id = 'gallery-uploaded-type';
                        previewEl.appendChild(typeInput);
                    }
                    typeInput.value = type;
                }

            } catch (error) {
                console.error(error);
                previewEl.innerHTML = `<p style="color:red;margin-top:1rem;">Upload gagal: ${error.message}</p>`;
            }
        };

        reader.readAsDataURL(file);
    }
};

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
