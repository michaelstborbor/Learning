// Browser-only. Crops a chosen photo to a centred square and shrinks it to
// a 512px WebP (JPEG where the browser can't write WebP), so profile
// photos are small and always fit in one upload request.

const SIZE = 512;

export async function shrinkAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo (JPG, PNG or WebP).");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That photo couldn't be opened. Try a JPG or PNG.");
  });
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();

  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await encode("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await encode("image/jpeg");
  if (!blob) throw new Error("That photo couldn't be prepared. Try another one.");
  return blob;
}
