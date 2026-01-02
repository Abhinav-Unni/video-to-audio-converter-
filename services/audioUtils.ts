import { AudioConversionResult, AudioFormat } from '../types';

// Helper to write string to DataView
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Helper to encode AudioBuffer to WAV
const bufferToWav = (abuffer: AudioBuffer, len: number): Blob => {
  const numOfChan = abuffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // Write WAV Header
  writeString(view, pos, 'RIFF'); pos += 4;
  view.setUint32(pos, length - 8, true); pos += 4;
  writeString(view, pos, 'WAVE'); pos += 4;
  writeString(view, pos, 'fmt '); pos += 4;

  view.setUint32(pos, 16, true); pos += 4; // Subchunk1Size
  view.setUint16(pos, 1, true); pos += 2; // AudioFormat (PCM)
  view.setUint16(pos, numOfChan, true); pos += 2;
  view.setUint32(pos, abuffer.sampleRate, true); pos += 4;
  view.setUint32(pos, abuffer.sampleRate * 2 * numOfChan, true); pos += 4; // ByteRate
  view.setUint16(pos, numOfChan * 2, true); pos += 2; // BlockAlign
  view.setUint16(pos, 16, true); pos += 2; // BitsPerSample

  writeString(view, pos, 'data'); pos += 4;
  view.setUint32(pos, length - pos - 4, true); pos += 4;

  // Interleave channels
  for (i = 0; i < abuffer.numberOfChannels; i++) {
    channels.push(abuffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      // Clamp the value to -1 to 1
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      // Scale to 16-bit integer
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

// Helper to encode AudioBuffer to MP3
const bufferToMp3 = async (abuffer: AudioBuffer, onProgress: (p: number) => void): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const channels = abuffer.numberOfChannels;
      const sampleRate = abuffer.sampleRate;
      const lame = (window as any).lamejs;

      if (!lame) {
        throw new Error("MP3 Encoder library (lamejs) not loaded.");
      }

      const mp3encoder = new lame.Mp3Encoder(channels, sampleRate, 192); // 192kbps
      const samplesLeft = abuffer.getChannelData(0);
      const samplesRight = channels > 1 ? abuffer.getChannelData(1) : undefined;
      
      // Convert Float32 to Int16
      const length = samplesLeft.length;
      const sampleBlockSize = 1152; // Multiples of 576
      const mp3Data: Int8Array[] = [];
      
      let processed = 0;
      
      const encodeChunk = () => {
        const chunkSize = 11520; // Process 10 blocks at a time to avoid freezing UI too much
        const end = Math.min(processed + chunkSize, length);
        
        const leftChunk = new Int16Array(end - processed);
        const rightChunk = samplesRight ? new Int16Array(end - processed) : undefined;
        
        for (let i = 0; i < end - processed; i++) {
          // Left
          let s = Math.max(-1, Math.min(1, samplesLeft[processed + i]));
          leftChunk[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          
          // Right
          if (samplesRight && rightChunk) {
            s = Math.max(-1, Math.min(1, samplesRight[processed + i]));
            rightChunk[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
        }
        
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk || leftChunk); // If mono, lamejs might expect duplicate or single? Lamejs docs say encodeBuffer takes left, right. If mono, right is undefined or same.
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
        
        processed = end;
        onProgress(80 + Math.round((processed / length) * 15)); // Progress 80 -> 95

        if (processed < length) {
          // Schedule next chunk
          setTimeout(encodeChunk, 0);
        } else {
          // Finish
          const finalBuf = mp3encoder.flush();
          if (finalBuf.length > 0) {
            mp3Data.push(finalBuf);
          }
          resolve(new Blob(mp3Data, { type: 'audio/mp3' }));
        }
      };

      encodeChunk();

    } catch (e) {
      reject(e);
    }
  });
};

export const extractAudioFromVideo = async (
  file: File,
  format: AudioFormat,
  onProgress: (progress: number) => void
): Promise<AudioConversionResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      onProgress(5); // Started reading

      const arrayBuffer = await file.arrayBuffer();
      onProgress(30); // Loaded into memory

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      onProgress(70); // Decoded

      let blob: Blob;
      
      if (format === 'wav') {
        onProgress(80);
        blob = bufferToWav(audioBuffer, audioBuffer.length);
      } else if (format === 'mp3') {
        onProgress(80);
        // bufferToMp3 handles 80->95 progress
        blob = await bufferToMp3(audioBuffer, onProgress);
      } else {
        throw new Error("Unsupported format");
      }
      
      onProgress(100);

      resolve({
        blob,
        url: URL.createObjectURL(blob),
        duration: audioBuffer.duration,
        format,
        size: blob.size
      });

    } catch (error) {
      console.error("Audio extraction failed:", error);
      reject(new Error("Failed to extract audio. The file might be corrupt or the format unsupported."));
    }
  });
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};