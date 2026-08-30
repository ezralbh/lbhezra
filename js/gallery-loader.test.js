const GalleryLoader = require('./gallery-loader');

describe('GalleryLoader Error Paths', () => {
    let loader;
    const mockContainerId = 'gallery-grid';
    let container;

    beforeEach(() => {
        // Setup DOM element
        container = document.createElement('div');
        container.id = mockContainerId;
        document.body.appendChild(container);

        // Reset mocks
        jest.clearAllMocks();
        global.fetch = jest.fn();
        global.console.error = jest.fn();

        // Create loader without auto-init to test loadGallery directly
        // We override init to do nothing for testing loadGallery in isolation
        const originalInit = GalleryLoader.prototype.init;
        GalleryLoader.prototype.init = jest.fn();
        loader = new GalleryLoader(mockContainerId);
        GalleryLoader.prototype.init = originalInit;
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    test('handles network failure (fetch rejects)', async () => {
        // Arrange
        const mockError = new Error('Network failure');
        global.fetch.mockRejectedValue(mockError);

        // Act
        await loader.loadGallery();

        // Assert
        expect(global.fetch).toHaveBeenCalledWith('data/gallery.json');
        expect(console.error).toHaveBeenCalledWith('Error loading gallery:', mockError);
        expect(loader.galleryItems).toEqual([]);
    });

    test('handles non-200 response (ok is false)', async () => {
        // Arrange
        global.fetch.mockResolvedValue({
            ok: false,
            status: 404
        });

        // Act
        await loader.loadGallery();

        // Assert
        expect(global.fetch).toHaveBeenCalledWith('data/gallery.json');
        expect(console.error).toHaveBeenCalledWith(
            'Error loading gallery:',
            expect.objectContaining({ message: 'Network response was not ok' })
        );
        expect(loader.galleryItems).toEqual([]);
    });
});
