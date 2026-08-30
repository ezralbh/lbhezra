/**
 * Tests for PublicationsLoader
 */

const fs = require('fs');
const path = require('path');

// Read the script content to evaluate it in the test environment
const scriptContent = fs.readFileSync(path.resolve(__dirname, '../js/publications.js'), 'utf8');

describe('PublicationsLoader Error Paths', () => {
    let originalConsoleError;
    let PublicationsLoader;

    beforeAll(() => {
        // Suppress console.error during tests to keep output clean
        originalConsoleError = console.error;
        console.error = jest.fn();
    });

    afterAll(() => {
        console.error = originalConsoleError;
    });

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="publication-grid"></div>
        `;

        // Execute the script in the current context to define the class
        // Remove the DOMContentLoaded event listener to prevent auto-initialization
        const scriptWithoutInit = scriptContent.replace(
            /document\.addEventListener\('DOMContentLoaded', \(\) => {[\s\S]*?}\);/,
            ''
        );

        // We need to use eval in the global scope or extract the class definition
        // Let's just define it globally for the test
        eval(scriptWithoutInit + '; global.PublicationsLoader = PublicationsLoader;');
        PublicationsLoader = global.PublicationsLoader;

        // Reset mocks
        global.fetch = jest.fn();
        console.error.mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should handle network response not ok', async () => {
        // Mock fetch to return a non-ok response
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
        });

        // Initialize loader
        // Since constructor calls init() and we don't want to test the full initialization flow here,
        // we can pass a non-existent container id so init() doesn't auto-trigger.
        const loader = new PublicationsLoader('non-existent', 'data/publications.json');

        // Wait for the async loadPublications to complete
        await loader.loadPublications();

        // Check if publications array is set to empty
        expect(loader.publications).toEqual([]);

        // Check if error was logged
        expect(console.error).toHaveBeenCalledWith('Error loading publications:', expect.any(Error));
        expect(console.error.mock.calls[0][1].message).toBe('Network response was not ok');
    });

    test('should handle network error (e.g. timeout, connection refused)', async () => {
        // Mock fetch to reject with an error
        const networkError = new Error('Failed to fetch');
        global.fetch.mockRejectedValueOnce(networkError);

        const loader = new PublicationsLoader('non-existent', 'data/publications.json');

        await loader.loadPublications();

        expect(loader.publications).toEqual([]);
        expect(console.error).toHaveBeenCalledWith('Error loading publications:', networkError);
    });
});
