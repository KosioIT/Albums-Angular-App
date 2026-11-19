import { S3Client, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, PutObjectCommand, paginateListObjectsV2 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/*
  The music files in Cloudflare R2 (S3-compatible, no fees for downloads):
    tracks/<album id>/...   the songs and the cover, one by one ("npm run r2:tracks")
    downloads/<album id>.zip  album downloads packed from them (albumZipService)
  The bucket is private: a user only gets a presigned link that works for one minute,
  and the file then comes straight from Cloudflare, not through this server.

  backend/.env: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
*/

const LINK_TTL_SECONDS = 60;
// Songs are streamed from the link (the browser asks for parts of the file while playing and
// seeking), so it has to work for longer than one album takes to play
const STREAM_TTL_SECONDS = 3 * 60 * 60;
let client;

export function isStorageConfigured() {
    const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
    return Boolean(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);
}

// Created on first use, so the .env values are already loaded
function s3() {
    if (!isStorageConfigured()) {
        throw new Error('R2 is not configured: set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET in backend/.env');
    }
    client ??= new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        forcePathStyle: true,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });
    return client;
}

const bucket = () => process.env.R2_BUCKET;

// Safe for Content-Disposition: ASCII fallback plus the exact name (RFC 6266)
export function attachmentHeader(fileName) {
    const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_');
    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

// One-minute link that downloads the object as a file, named like the key ("load.zip") unless given
export async function createDownloadLink(key, fileName = key.split('/').pop()) {
    const command = new GetObjectCommand({
        Bucket: bucket(),
        Key: key,
        ResponseContentDisposition: attachmentHeader(fileName),
        ResponseContentType: 'application/octet-stream',
    });
    return getSignedUrl(s3(), command, { expiresIn: LINK_TTL_SECONDS });
}

// Link the player streams a song from (served with the type it was uploaded with, audio/mpeg)
export async function createStreamLink(key) {
    const command = new GetObjectCommand({ Bucket: bucket(), Key: key });
    return getSignedUrl(s3(), command, { expiresIn: STREAM_TTL_SECONDS });
}

// Link the admin's browser uploads one file to (PUT, with exactly this Content-Type), so the file
// goes straight to R2 and not through this server. The bucket needs a CORS rule for it (see README).
const UPLOAD_TTL_SECONDS = 30 * 60;
export async function createUploadLink(key, contentType) {
    const command = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType });
    return getSignedUrl(s3(), command, { expiresIn: UPLOAD_TTL_SECONDS });
}

// The object's content as a stream (to save an archive to a temporary file)
export async function downloadStream(key) {
    const { Body } = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return Body;
}

// [{ key, size }] of every object in the bucket (or under a prefix such as "tracks/")
export async function listObjects(prefix) {
    const objects = [];
    for await (const page of paginateListObjectsV2({ client: s3() }, { Bucket: bucket(), Prefix: prefix })) {
        for (const o of page.Contents ?? []) objects.push({ key: o.Key, size: o.Size });
    }
    return objects;
}

// Size of an object, or null when it does not exist
export async function objectSize(key) {
    try {
        const head = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
        return head.ContentLength ?? null;
    } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return null;
        throw err;
    }
}

// Streams a file into the bucket (multipart, so archives of any size work)
export async function uploadStream(key, body, contentType = 'application/zip') {
    const upload = new Upload({
        client: s3(),
        params: { Bucket: bucket(), Key: key, Body: body, ContentType: contentType },
        queueSize: 4,
        partSize: 16 * 1024 * 1024,
    });
    await upload.done();
}

export async function deleteObject(key) {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
