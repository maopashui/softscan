export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface OCRBlock {
  text: string;
  box_2d: number[]; // [ymin, xmin, ymax, xmax] 0-1000 scale
}

export interface OCRResult {
  fullText: string;
  blocks: OCRBlock[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  thumbnail: string; // Base64
  fullText: string;
  blocks: OCRBlock[];
}

export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD'
}