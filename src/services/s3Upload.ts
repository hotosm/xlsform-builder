import { getRuntimeConfig } from '@/utils/runtimeConfig';

const API_BASE_URL = getRuntimeConfig('VITE_API_URL', 'https://api.xlsforms.field.hotosm.org');
const METADATA_URL = getRuntimeConfig(
  'VITE_METADATA_URL',
  'https://xlsforms.s3.amazonaws.com/metadata.json'
);

export async function getPreSignedUrl(
  fileName: string,
  fileType: string,
): Promise<PreSignedUrlResponse> {
  const response = await fetch(`${API_BASE_URL}/api/presigned-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName,
      fileType,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get pre-signed URL: ${response.statusText}`);
  }

  return response.json();
}

export async function getPreSignedDownloadUrl(
  fileName: string,
): Promise<PreSignedDownloadUrlResponse> {
  const response = await fetch(`${API_BASE_URL}/api/presigned-download-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get pre-signed download URL: ${response.statusText}`);
  }

  return response.json();
}

export async function uploadToS3(
  file: File,
  uploadUrl: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

export async function uploadJsonToS3(data: unknown, uploadUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Failed to upload JSON with status ${xhr.status}: ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Failed to upload JSON'));
    });

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(blob);
  });
}

export async function fetchMetadata(): Promise<{ forms: FormMetadata[] }> {
  const cacheBustUrl = `${METADATA_URL}?t=${Date.now()}`;

  const response = await fetch(cacheBustUrl, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch metadata: ${response.statusText}`);
  }

  return response.json();
}
