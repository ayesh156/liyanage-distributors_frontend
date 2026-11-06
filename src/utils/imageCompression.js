/**
 * @file imageCompression.js
 * @description Client-side image downscaling and compression utility using HTML5 Canvas.
 * Ensures uploaded vehicle images or receipt photos are compressed into lightweight
 * Base64 strings (typically < 100KB) to prevent localStorage quota exhaustion
 * and guarantee optimal UI rendering performance across mobile and desktop devices.
 */

/**
 * Downscales and compresses an image file to a Base64 JPEG data URL.
 *
 * @param {File|Blob} file - Raw image file from file input.
 * @param {number} [maxWidth=600] - Maximum allowable pixel width (defaults to 600px).
 * @param {number} [maxHeight=600] - Maximum allowable pixel height (defaults to 600px).
 * @param {number} [quality=0.75] - JPEG image compression factor (0.0 to 1.0).
 * @returns {Promise<string>} Compressed Base64 Data URL.
 */
export function compressImageToDataUrl(file, maxWidth = 600, maxHeight = 600, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No image file provided for compression.'));
    }

    if (!file.type || !file.type.startsWith('image/')) {
      return reject(new Error('Unsupported file format. Please upload a valid image (JPEG, PNG, WebP).'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read the selected image file.'));

    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Corrupted image data could not be decoded.'));

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D rendering context is not supported in this browser.'));
        }

        // Apply high-quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed image/jpeg
        try {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (exportErr) {
          reject(exportErr);
        }
      };

      img.src = loadEvent.target.result;
    };

    reader.readAsDataURL(file);
  });
}

