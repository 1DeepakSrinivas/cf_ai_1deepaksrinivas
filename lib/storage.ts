import fs from 'fs/promises';
import path from 'path';

const STORAGE_PATH = process.env.STORAGE_PATH || './storage';
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';

export interface StorageResult {
  fileId: string;
  filePath: string;
  url?: string;
}

/**
 * Initialize storage directory
 */
export async function initStorage(): Promise<void> {
  if (STORAGE_TYPE === 'local') {
    await fs.mkdir(STORAGE_PATH, { recursive: true });
    await fs.mkdir(path.join(STORAGE_PATH, 'pdfs'), { recursive: true });
    await fs.mkdir(path.join(STORAGE_PATH, 'images'), { recursive: true });
  }
}

/**
 * Save uploaded file
 */
export async function saveFile(
  file: File | Buffer,
  filename: string,
  subfolder: string = 'pdfs'
): Promise<StorageResult> {
  await initStorage();

  const fileId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const extension = path.extname(filename);
  const filePath = path.join(STORAGE_PATH, subfolder, `${fileId}${extension}`);

  if (file instanceof File) {
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
  } else {
    await fs.writeFile(filePath, file);
  }

  return {
    fileId,
    filePath,
    url: STORAGE_TYPE === 'local' ? `/storage/${subfolder}/${fileId}${extension}` : undefined,
  };
}

/**
 * Read file from storage
 */
export async function readFile(fileId: string, subfolder: string = 'pdfs'): Promise<Buffer> {
  const files = await fs.readdir(path.join(STORAGE_PATH, subfolder));
  const file = files.find((f) => f.startsWith(fileId));

  if (!file) {
    throw new Error(`File not found: ${fileId}`);
  }

  const filePath = path.join(STORAGE_PATH, subfolder, file);
  return await fs.readFile(filePath);
}

/**
 * Delete file from storage
 */
export async function deleteFile(fileId: string, subfolder: string = 'pdfs'): Promise<void> {
  const files = await fs.readdir(path.join(STORAGE_PATH, subfolder));
  const file = files.find((f) => f.startsWith(fileId));

  if (file) {
    const filePath = path.join(STORAGE_PATH, subfolder, file);
    await fs.unlink(filePath);
  }
}

/**
 * Get file path
 */
export function getFilePath(fileId: string, subfolder: string = 'pdfs'): string {
  return path.join(STORAGE_PATH, subfolder, fileId);
}

