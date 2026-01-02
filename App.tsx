import React, { useState } from 'react';
import { UploadArea } from './components/UploadArea';
import { Button } from './components/Button';
import { extractAudioFromVideo, formatTime, formatSize } from './services/audioUtils';
import { AudioConversionResult, ProcessingState, ProcessStatus, AudioFormat } from './types';
import { Music, Download, RefreshCw, AlertTriangle, FileVideo, Cpu, Settings2 } from 'lucide-react';

const App = () => {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<AudioFormat>('wav');
  const [conversionState, setConversionState] = useState<ProcessingState>({ status: ProcessStatus.IDLE, progress: 0 });
  const [conversionResult, setConversionResult] = useState<AudioConversionResult | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    // Reset states
    setConversionState({ status: ProcessStatus.IDLE, progress: 0 });
    setConversionResult(null);
  };

  const handleConvert = async () => {
    if (!file) return;

    setConversionState({ status: ProcessStatus.PROCESSING, progress: 0, message: 'Initializing decoder...' });

    try {
      const result = await extractAudioFromVideo(file, format, (progress) => {
        let msg = 'Processing...';
        if (progress < 30) msg = 'Loading video file...';
        else if (progress < 70) msg = 'Decoding audio stream...';
        else if (progress < 80) msg = 'Preparing encoder...';
        else msg = format === 'mp3' ? 'Encoding MP3...' : 'Writing WAV file...';

        setConversionState(prev => ({
          ...prev,
          progress,
          message: msg
        }));
      });

      setConversionResult(result);
      setConversionState({ status: ProcessStatus.COMPLETED, progress: 100, message: 'Done!' });
    } catch (error) {
      setConversionState({ 
        status: ProcessStatus.ERROR, 
        progress: 0, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      });
    }
  };

  const handleReset = () => {
    setFile(null);
    setConversionResult(null);
    setConversionState({ status: ProcessStatus.IDLE, progress: 0 });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Music className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Video to Audio
            </h1>
          </div>
          <span className="text-sm text-slate-500">
            v1.1.0
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        
        {/* Intro */}
        {!file && (
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold text-white tracking-tight">
              Unlimited Video to Audio Conversion
            </h2>
            <p className="text-lg text-slate-400 max-w-xl mx-auto">
              Extract high-quality audio from your video files locally in your browser. <br/>
              Support for lossless <span className="text-indigo-400 font-medium">WAV</span> and compressed <span className="text-indigo-400 font-medium">MP3</span>.
            </p>
          </div>
        )}

        {/* Main Interface */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          
          {/* Step 1: Upload */}
          {!file && (
            <div className="p-8">
              <UploadArea onFileSelect={handleFileSelect} />
            </div>
          )}

          {/* Step 2: Processing & Results */}
          {file && (
            <div className="divide-y divide-slate-800">
              
              {/* File Info Bar */}
              <div className="px-6 py-4 flex items-center justify-between bg-slate-800/30">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 flex-shrink-0">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-200 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500 flex gap-2">
                      <span>{formatSize(file.size)}</span>
                      <span>•</span>
                      <span>{file.type}</span>
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-slate-400 hover:text-red-400">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New
                </Button>
              </div>

              {/* Converter Section */}
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-400" />
                    Audio Extraction
                  </h3>
                  {conversionState.status === ProcessStatus.COMPLETED && (
                    <span className="text-xs font-medium text-green-400 bg-green-900/20 px-2 py-1 rounded border border-green-900/30">
                      Success
                    </span>
                  )}
                </div>

                {conversionState.status === ProcessStatus.ERROR && (
                   <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-3 text-red-200">
                     <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                     <div className="text-sm">{conversionState.error}</div>
                   </div>
                )}

                {conversionState.status === ProcessStatus.PROCESSING && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{conversionState.message}</span>
                      <span>{Math.round(conversionState.progress)}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300 ease-out" 
                        style={{ width: `${conversionState.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {conversionState.status === ProcessStatus.IDLE && (
                   <div className="space-y-6">
                     <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                        <div className="p-2 bg-slate-800 rounded text-slate-400">
                          <Settings2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-slate-300 mb-1">Output Format</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="format" 
                                value="wav" 
                                checked={format === 'wav'} 
                                onChange={() => setFormat('wav')}
                                className="text-indigo-500 focus:ring-indigo-500 bg-slate-800 border-slate-600"
                              />
                              <span className="text-sm text-slate-200">WAV <span className="text-slate-500 text-xs">(Lossless)</span></span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="format" 
                                value="mp3" 
                                checked={format === 'mp3'} 
                                onChange={() => setFormat('mp3')}
                                className="text-indigo-500 focus:ring-indigo-500 bg-slate-800 border-slate-600"
                              />
                              <span className="text-sm text-slate-200">MP3 <span className="text-slate-500 text-xs">(Compressed)</span></span>
                            </label>
                          </div>
                        </div>
                     </div>

                     <Button onClick={handleConvert} className="w-full sm:w-auto" size="lg">
                        Convert to {format.toUpperCase()}
                     </Button>
                   </div>
                )}

                {conversionResult && (
                  <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-base font-medium text-slate-200">
                        Ready to download
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatTime(conversionResult.duration)} • {formatSize(conversionResult.size)} • {conversionResult.format.toUpperCase()}
                      </div>
                    </div>
                    <a 
                      href={conversionResult.url} 
                      download={`${file.name.split('.')[0]}.${conversionResult.format}`}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-green-900/20"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        <div className="text-center text-xs text-slate-600">
          <p>
            Client-side conversion provided by Web Audio API & LameJS. <br/>
            Files are processed entirely on your device.
          </p>
        </div>

      </main>
    </div>
  );
};

export default App;