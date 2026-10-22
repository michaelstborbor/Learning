// Browser-only. Shrinks a chosen poster image to a 1600px-wide WebP (JPEG
// where the browser can't write WebP), so posters load fast on mobile data
// and always fit within one upload request.

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1000;

export async function shrinkPoster(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file for the poster.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That image couldn't be opened. Try a JPG or PNG.");
  });
  const scale = Math.min(1, MAX_WIDTH / bitmap.width, MAX_HEIGHT / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  const webp = await encode("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await encode("image/jpeg");
  if (!blob) throw new Error("That image couldn't be prepared. Try another one.");
  return blob;
}

export async function uploadPoster(courseId: string, blob: Blob): Promise<string> {
  const res = await fetch(`/api/courses/${courseId}/poster`, {
    method: "POST",
    headers: { "Content-Type": blob.type },
    body: blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "The poster couldn't be uploaded.");
  return data.posterUrl as string;
}
