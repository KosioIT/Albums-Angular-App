import { S3Client, GetObjectCommand, HeadObjectCommand, paginateListObjectsV2 } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/*
  Album archives in Cloudflare R2 (S3-compatible, no fees for downloads).
  The bucket is private: a user only gets a presigned link that works for one minute,
  and the file then comes straight from Cloudflare, not through this server.

  backend/.env: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
*/

const LINK_TTL_SECONDS = 60;
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

// One-minute link that downloads the object as a file named like the key ("load.zip")
export async function createDownloadLink(key) {
    const fileName = key.split('/').pop();
    const command = new GetObjectCommand({
        Bucket: bucket(),
        Key: key,
        ResponseContentDisposition: attachmentHeader(fileName),
        ResponseContentType: 'application/octet-stream',
    });
    return getSignedUrl(s3(), command, { expiresIn: LINK_TTL_SECONDS });
}

// [{ key, size }] of every object in the bucket
export async function listObjects() {
    const objects = [];
    for await (const page of paginateListObjectsV2({ client: s3() }, { Bucket: bucket() })) {
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
export async function uploadStream(key, body) {
    const upload = new Upload({
        client: s3(),
        params: { Bucket: bucket(), Key: key, Body: body, ContentType: 'application/zip' },
        queueSize: 4,
        partSize: 16 * 1024 * 1024,
    });
    await upload.done();
}
