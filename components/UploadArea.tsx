import React, { useRef, useState } from 'react';
import { Upload, FileVideo, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from './Button';

interface UploadAreaProps {
  onFileSelect: (file: File) => void;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  const validateAndPassFile = (file: File) => {
    if (file.type.startsWith('video/')) {
      onFileSelect(file);
    } else {
      alert("Please upload a valid video file.");
    }
  };

  return (
    <div
      className={clsx(
        "relative rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out p-12 text-center group cursor-pointer",
        isDragging
          ? "border-indigo-500 bg-indigo-500/10"
          : "border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="video/*"
        onChange={handleFileInput}
      />
      
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={clsx(
          "p-4 rounded-full transition-colors duration-300",
          isDragging ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-700/50 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-300"
        )}>
          {isDragging ? <Upload className="w-10 h-10" /> : <FileVideo className="w-10 h-10" />}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-200">
            {isDragging ? "Drop video here" : "Upload Video"}
          </h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            Drag and drop your video file here, or click to browse. 
            <br/><span className="text-xs opacity-70">Supports MP4, MOV, MKV, AVI, WEBM</span>
          </p>
        </div>
        
        <div className="pt-4">
          <Button variant="secondary" size="sm" onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}>
            Select File
          </Button>
        </div>
      </div>
    </div>
  );
};