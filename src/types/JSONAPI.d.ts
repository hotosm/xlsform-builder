interface FormMetadata {
  id: string;
  title: string;
  location: string;
  description: string;
  tags: string[];
  url: string;
  external_link: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface PreSignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
}

interface PreSignedDownloadUrlResponse {
  downloadUrl: string;
}
