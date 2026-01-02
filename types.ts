export type AudioFormat = 'wav' | 'mp3';

export interface AudioConversionResult {
  blob: Blob;
  url: string;
  duration: number;
  format: AudioFormat;
  size: number;
}

export enum ProcessStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface ProcessingState {
  status: ProcessStatus;
  progress: number; // 0 to 100
  message?: string;
  error?: string;
}