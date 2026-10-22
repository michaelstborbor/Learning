import "server-only";

import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { AwsClient } from "aws4fetch";
import { del as blobDel, get as blobGet, head as blobHead, put as blobPut, BlobNotFoundError } from "@vercel/blob";

// File storage for course media, behind one small interface so the rest of
// the app never knows which backend is in use.
//
//  - "s3": any S3-compatible bucket (Cloudflare R2, AWS S3, Backblaze B2,
//    MinIO...). Browsers upload and download directly with short-lived
//    signed URLs, so large files never pass through the web server. This is
//    the one to use in production: Render's free web services have no
//    persistent disk, so local files vanish on every deploy.
//  - "blob": a private Vercel Blob store. Browsers upload straight to Blob
//    (in parts, so large videos work); downloads are streamed back through
//    the app after the usual permission check. The one to use on Vercel,
//    whose functions reject request bodies over 4.5 MB and have no
//    writable disk.
//  - "local": a folder on the server's disk. Zero setup, for development
//    or a host with a persistent disk. Uploads stream through the app.
//
// Chosen automatically: "s3" when STORAGE_S3_BUCKET is set, "blob" when
// BLOB_READ_WRITE_TOKEN is set (Vercel adds it when a Blob store is
// connected to the project), else "local". See ENVIRONMENT.md.

export type StorageDriver = "s3" | "blob" | "local";

export function storageDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "s3" || explicit === "blob" || explicit === "local") return explicit;
  if (process.env.STORAGE_S3_BUCKET) return "s3";
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local";
}

export function maxUploadBytes(): number {
  const mb = Number(process.env.MEDIA_MAX_UPLOAD_MB ?? 500);
  return (Number.isFinite(mb) && mb > 0 ? mb : 500) * 1024 * 1024;
}

// ---- Local disk -----------------------------------------------------------

function localRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_STORAGE_DIR ?? path.join(process.cwd(), "storage", "media"));
}

function localPath(key: string): string {
  // Keys are generated server-side, but never trust a path blindly.
  const resolved = path.resolve(localRoot(), key);
  if (!resolved.startsWith(localRoot() + path.sep)) throw new Error("Invalid storage key.");
  return resolved;
}

/** Streams a request body to disk, aborting past `limit` bytes. Returns
 * the number of bytes written. */
export async function writeLocal(
  key: string,
  body: ReadableStream<Uint8Array>,
  limit: number,
): Promise<number> {
  const target = localPath(key);
  await mkdir(path.dirname(target), { recursive: true });
  let written = 0;
  const source = Readable.fromWeb(body as import("node:stream/web").ReadableStream<Uint8Array>);
  source.on("data", (chunk: Buffer) => {
    written += chunk.length;
    if (written > limit) source.destroy(new Error("File is larger than allowed."));
  });
  try {
    await pipeline(source, createWriteStream(target));
  } catch (error) {
    await rm(target, { force: true });
    throw error;
  }
  return written;
}

export async function localSize(key: string): Promise<number | null> {
  try {
    return (await stat(/*turbopackIgnore: true*/ localPath(key))).size;
  } catch {
    return null;
  }
}

export function readLocal(key: string, range?: { start: number; end: number }) {
  const stream = createReadStream(/*turbopackIgnore: true*/ localPath(key), range);
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

// ---- S3-compatible --------------------------------------------------------

function s3Config() {
  const bucket = process.env.STORAGE_S3_BUCKET;
  const endpoint = process.env.STORAGE_S3_ENDPOINT?.replace(/\/+$/, "");
  const accessKeyId = process.env.STORAGE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY;
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 storage is selected but STORAGE_S3_BUCKET, STORAGE_S3_ENDPOINT, STORAGE_S3_ACCESS_KEY_ID or STORAGE_S3_SECRET_ACCESS_KEY is missing (see ENVIRONMENT.md).",
    );
  }
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: process.env.STORAGE_S3_REGION ?? "auto",
  });
  return { client, objectUrl: (key: string) => `${endpoint}/${bucket}/${encodeKey(key)}` };
}

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

const SIGNED_URL_SECONDS = 60 * 60;

async function presign(method: "GET" | "PUT", key: string, query: Record<string, string> = {}) {
  const { client, objectUrl } = s3Config();
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(SIGNED_URL_SECONDS));
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
  const signed = await client.sign(url.toString(), { method, aws: { signQuery: true } });
  return signed.url;
}

// ---- Vercel Blob ----------------------------------------------------------

// Largest slice of a video or audio file sent per request. Browsers ask for
// "bytes=0-" (everything) when playback starts; answering with a bounded
// 206 keeps each function call short and lets the player fetch the rest
// as it needs it.
const BLOB_MAX_CHUNK = 8 * 1024 * 1024;

export async function readBlob(
  key: string,
  range?: { start: number; end: number },
): Promise<ReadableStream<Uint8Array> | null> {
  const result = await blobGet(key, {
    access: "private",
    headers: range ? { Range: `bytes=${range.start}-${range.end}` } : undefined,
  });
  return result?.stream ?? null;
}

export function boundedRange(range: { start: number; end: number }) {
  return { start: range.start, end: Math.min(range.end, range.start + BLOB_MAX_CHUNK - 1) };
}

async function blobSize(key: string): Promise<number | null> {
  try {
    return (await blobHead(key)).size;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}

// ---- Public interface -----------------------------------------------------

export type UploadTarget =
  | {
      url: string;
      method: "PUT";
      // Headers the browser must send with the upload.
      headers: Record<string, string>;
    }
  | {
      // Upload with @vercel/blob/client's upload(): it asks handleUploadUrl
      // for a one-off token scoped to `pathname`, then sends the file to
      // Blob directly.
      method: "BLOB";
      handleUploadUrl: string;
      pathname: string;
      contentType: string;
    };

export async function createUploadTarget(
  key: string,
  mediaId: string,
  contentType: string,
  contentEncoding: string | null,
): Promise<UploadTarget> {
  const headers: Record<string, string> = { "Content-Type": contentType };
  if (contentEncoding) headers["Content-Encoding"] = contentEncoding;
  const driver = storageDriver();
  if (driver === "s3") {
    return { url: await presign("PUT", key), method: "PUT", headers };
  }
  if (driver === "blob") {
    return { method: "BLOB", handleUploadUrl: `/api/media/${mediaId}/blob`, pathname: key, contentType };
  }
  return { url: `/api/media/${mediaId}/upload`, method: "PUT", headers };
}

/** Saves a small file (such as a course poster) from the server. */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const driver = storageDriver();
  if (driver === "blob") {
    await blobPut(key, body, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: true });
    return;
  }
  if (driver === "s3") {
    const { client, objectUrl } = s3Config();
    const res = await client.fetch(objectUrl(key), {
      method: "PUT",
      body: new Uint8Array(body),
      headers: { "Content-Type": contentType },
    });
    if (!res.ok) throw new Error(`Storage upload failed (${res.status}).`);
    return;
  }
  const target = localPath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ target, body);
}

/** Reads a small stored file back whole, or null if it's missing. */
export async function readObject(key: string): Promise<Buffer | null> {
  const driver = storageDriver();
  if (driver === "blob") {
    const stream = await readBlob(key).catch(() => null);
    return stream ? Buffer.from(await new Response(stream).arrayBuffer()) : null;
  }
  if (driver === "s3") {
    const { client, objectUrl } = s3Config();
    const res = await client.fetch(objectUrl(key));
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
  try {
    return await readFile(/*turbopackIgnore: true*/ localPath(key));
  } catch {
    return null;
  }
}

/** Size of the stored object, or null if it isn't there (yet). */
export async function storedSize(key: string): Promise<number | null> {
  const driver = storageDriver();
  if (driver === "local") return localSize(key);
  if (driver === "blob") return blobSize(key);
  const { client, objectUrl } = s3Config();
  const res = await client.fetch(objectUrl(key), { method: "HEAD" });
  if (!res.ok) return null;
  return Number(res.headers.get("content-length") ?? 0);
}

export async function signedDownloadUrl(
  key: string,
  opts: { contentType: string; disposition: string },
): Promise<string> {
  return presign("GET", key, {
    "response-content-type": opts.contentType,
    "response-content-disposition": opts.disposition,
    "response-cache-control": "private, max-age=3600",
  });
}

export async function deleteStored(key: string): Promise<void> {
  const driver = storageDriver();
  if (driver === "local") {
    await rm(localPath(key), { force: true });
    return;
  }
  if (driver === "blob") {
    await blobDel(key);
    return;
  }
  const { client, objectUrl } = s3Config();
  await client.fetch(objectUrl(key), { method: "DELETE" });
}
