🎯 **What:** The `GalleryLightbox` class in `js/gallery.js` was completely untested. This component is responsible for collecting media items from the DOM, creating a lightbox overlay, and handling complex interactions like navigation, video playback, and keyboard controls. Due to its heavy DOM manipulation and event binding, it presented a significant testing gap.

📊 **Coverage:** A new Jest test suite (`js/gallery.test.js`) has been added using `jest-environment-jsdom`. It covers the following scenarios:
*   **Initialization:** Verifies the lightbox HTML is correctly appended to the document body and event listeners are attached to gallery items.
*   **Data Collection:** Ensures `collectImages()` correctly parses images, videos, and associated metadata (titles, descriptions) from the DOM.
*   **Navigation & State:** Tests `open()`, `close()`, `next()`, and `prev()` methods to confirm accurate state transitions (class toggling, index changes, looping behavior).
*   **Media Handling:** Verifies that videos play when hovered or opened in the lightbox, and pause when closed (video functions are properly mocked in jsdom).
*   **Keyboard Controls:** Confirms navigation via Arrow keys and closing via the Escape key work as intended.

✨ **Result:** Test coverage for the gallery functionality has significantly improved, ensuring the lightbox logic and media interactions remain stable during future refactoring. We also established a pattern for testing vanilla JS classes by adding conditional exports for Node environments.
