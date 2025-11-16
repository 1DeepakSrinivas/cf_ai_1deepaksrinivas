import pdf from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { readFile } from './storage';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  images: ExtractedImage[];
}

export interface ExtractedImage {
  imageId: string;
  pageNumber: number;
  imagePath: string;
  ocrText?: string;
  width: number;
  height: number;
}

export interface ExtractionResult {
  documentId: string;
  totalPages: number;
  pages: ExtractedPage[];
  images: ExtractedImage[];
  fullText: string;
}

/**
 * Extract text and images from PDF
 */
export async function extractPDF(fileId: string): Promise<ExtractionResult> {
  const buffer = await readFile(fileId);
  const data = await pdf(buffer);

  const pages: ExtractedPage[] = [];
  const images: ExtractedImage[] = [];
  let fullText = '';

  // Extract text from each page
  for (let i = 0; i < data.numpages; i++) {
    const pageText = data.text || '';
    const page: ExtractedPage = {
      pageNumber: i + 1,
      text: pageText,
      images: [],
    };

    pages.push(page);
    fullText += pageText + '\n\n';
  }

  // Note: pdf-parse doesn't extract images directly
  // For image extraction, we would need pdfjs-dist or another library
  // This is a simplified version - in production, use pdfjs-dist for image extraction

  return {
    documentId: fileId,
    totalPages: data.numpages,
    pages,
    images,
    fullText: fullText.trim(),
  };
}

/**
 * Extract images from PDF using pdfjs-dist
 */
export async function extractImagesFromPDF(fileId: string): Promise<ExtractedImage[]> {
  // This would require pdfjs-dist implementation
  // For now, return empty array - can be extended with pdfjs-dist
  return [];
}

/**
 * Perform OCR on an image
 */
export async function ocrImage(imagePath: string): Promise<string> {
  const worker = await createWorker('eng');
  const { data: { text } } = await worker.recognize(imagePath);
  await worker.terminate();
  return text.trim();
}

/**
 * Process extracted images with OCR
 */
export async function processImagesWithOCR(
  images: ExtractedImage[]
): Promise<ExtractedImage[]> {
  const processedImages: ExtractedImage[] = [];

  for (const image of images) {
    try {
      const ocrText = await ocrImage(image.imagePath);
      processedImages.push({
        ...image,
        ocrText,
      });
    } catch (error) {
      console.error(`OCR failed for image ${image.imageId}:`, error);
      processedImages.push(image);
    }
  }

  return processedImages;
}

/**
 * Chunk text into smaller pieces
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk.trim());
    start = end - overlap;
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

