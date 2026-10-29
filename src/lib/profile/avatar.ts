// Turns any photo into a small square JPEG (as a data URL) that is cheap to store and to show
// next to someone's name everywhere in the app.
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const OUTPUT_PX = 192;
const MAX_DATA_URL_CHARS = 60_000;

interface Loaded {
  source: CanvasImageSource;
  width: number;
  height: number;
}

async function loadImage(file: File): Promise<Loaded> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file); // also respects the phone's rotation
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      /* fall through to <img> */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be read."));
    };
    img.src = url;
  });
}

export async function photoToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image (JPG, PNG or WebP).");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That photo is too large (maximum 10 MB).");

  const { source, width, height } = await loadImage(file);
  const side = Math.min(width, height); // centre square crop
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_PX;
  canvas.height = OUTPUT_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser cannot process images.");
  ctx.fillStyle = "#ffffff"; // JPEG has no transparency
  ctx.fillRect(0, 0, OUTPUT_PX, OUTPUT_PX);
  ctx.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, OUTPUT_PX, OUTPUT_PX);

  for (const quality of [0.85, 0.75, 0.65, 0.5]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_DATA_URL_CHARS) return url;
  }
  throw new Error("Could not make this photo small enough. Try a different one.");
}
