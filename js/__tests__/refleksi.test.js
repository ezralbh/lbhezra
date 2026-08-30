const RefleksiLoader = require('../refleksi.js');

describe('RefleksiLoader', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="list-view"></div>
      <div id="article-view"></div>
      <div id="refleksi-grid"></div>
    `;
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ refleksi: [] }),
      })
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renderList handles empty articles array correctly', async () => {
    const loader = new RefleksiLoader('refleksi-grid', 'data/test.json');

    // Wait for init to finish before checking state (since init calls loadArticles)
    await new Promise(process.nextTick);

    // Call renderList
    loader.renderList();

    // Verify the list view is active and article view is not
    expect(document.getElementById('list-view').classList.contains('active')).toBe(true);
    expect(document.getElementById('article-view').classList.contains('active')).toBe(false);

    // Verify the empty state message is shown
    const listContainer = document.getElementById('refleksi-grid');
    expect(listContainer.innerHTML).toContain('Belum ada tulisan tersedia.');
  });
});
