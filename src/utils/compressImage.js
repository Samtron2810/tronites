/**
 * Compresses an image file to reduce upload size.
 * Resizes to max 1920px width/height and reduces quality to 0.7.
 * Returns a compressed File object.
 */
const compressImage = (file, maxWidth = 1920, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    // If file is small enough, skip compression
    if (file.size < 500 * 1024) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Resize if too large
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height / width) * maxWidth);
            width = maxWidth;
          } else {
            width = Math.round((width / height) * maxWidth);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas toBlob failed"));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => reject(new Error("Image loading failed"));
    };
    reader.onerror = () => reject(new Error("FileReader failed"));
  });
};

export default compressImage;
