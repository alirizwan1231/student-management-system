// Any screen can open the in-app file viewer without importing it.
export interface OpenFileRequest {
  name: string; // file name WITH extension (decides which viewer is used)
  cacheKey?: string; // stable id (e.g. storage path): the file is downloaded once and kept on this device
  getUrl?: () => Promise<string>; // how to get a fresh signed download link
  blob?: Blob; // already on this device (e.g. a file that is still waiting to upload)
}

export const OPEN_FILE_EVENT = "um:open-file";

export function openFileViewer(request: OpenFileRequest) {
  window.dispatchEvent(new CustomEvent<OpenFileRequest>(OPEN_FILE_EVENT, { detail: request }));
}
