/*
  Uploads a file to a presigned R2 link (PUT) and reports progress (0..1).
  Not through the api instance: the link carries its own signature, and an extra
  Authorization header would make R2 refuse it. XMLHttpRequest, because fetch cannot
  report upload progress.
*/
export function uploadFile(
  url: string,
  file: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
): { done: Promise<void>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const done = new Promise<void>((resolve, reject) => {
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? (onProgress(1), resolve())
        : reject(new Error(`Upload failed (HTTP ${xhr.status})`));
    xhr.onerror = () => reject(new Error('Upload failed: the storage did not answer (check the bucket CORS rule)'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    xhr.send(file);
  });
  return { done, abort: () => xhr.abort() };
}
