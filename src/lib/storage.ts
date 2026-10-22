import "server-only";

import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { AwsClient } from "aws4fetch";

// File storage for course media, behind one small interface so the rest of
// the app never knows which backend is in use.
//
//  - "s3": any S3-compatible bucket (Cloudflare R2, AWS S3, Backblaze B2,
//    MinIO...). Browsers upload and download directly with short-lived
//    signed URLs, so large files never pass through the web server. This is
//    the one to use in production: Render's free web services have no
//    persistent disk, so local files vanish on every deploy.
//  - "local": a folder on the server's disk. Zero setup, for development
//    or a host with a persistent disk. Uploads stream through the app.
//
// Chosen automatically: "s3" when STORAGE_S3_BUCKET is set, else "local".
// See ENVIRONMENT.md for every variable.

export type StorageDriver = "s3" | "local";

export function storageDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "s3" || explicit === "local") return explicit;
  return process.env.STORAGE_S3_BUCKET ? "s3" : "local";
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

// ---- Public interface -----------------------------------------------------

export interface UploadTarget {
  url: string;
  method: "PUT";
  // Headers the browser must send with the upload.
  headers: Record<string, string>;
}

export async function createUploadTarget(
  key: string,
  mediaId: string,
  contentType: string,
  contentEncoding: string | null,
): Promise<UploadTarget> {
  const headers: Record<string, string> = { "Content-Type": contentType };
  if (contentEncoding) headers["Content-Encoding"] = contentEncoding;
  if (storageDriver() === "s3") {
    return { url: await presign("PUT", key), method: "PUT", headers };
  }
  return { url: `/api/media/${mediaId}/upload`, method: "PUT", headers };
}

/** Size of the stored object, or null if it isn't there (yet). */
export async function storedSize(key: string): Promise<number | null> {
  if (storageDriver() === "local") return localSize(key);
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
  if (storageDriver() === "local") {
    await rm(localPath(key), { force: true });
    return;
  }
  const { client, objectUrl } = s3Config();
  await client.fetch(objectUrl(key), { method: "DELETE" });
}
