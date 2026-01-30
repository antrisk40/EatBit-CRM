'use client';

import { X, Download, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType
}: FilePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const isImage = fileType.startsWith('image/');
  const isVideo = fileType.startsWith('video/');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex flex-col">
          <h3 className="font-bold text-lg truncate max-w-md">{fileName}</h3>
          <p className="text-xs text-gray-300 uppercase tracking-widest">{fileType}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <a
            href={fileUrl}
            download={fileName}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {isImage && (
          <div className="relative transition-transform duration-300 ease-out" style={{ transform: `scale(${zoom})` }}>
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        )}

        {isVideo && (
          <video
            src={fileUrl}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl bg-black"
          >
            Your browser does not support the video tag.
          </video>
        )}

        {!isImage && !isVideo && (
          <div className="bg-white/10 p-12 rounded-3xl text-center border border-white/20">
            <Maximize2 className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-white mb-2">Preview not available</h4>
            <p className="text-gray-400">This file type ({fileType}) cannot be previewed directly.</p>
            <a
              href={fileUrl}
              download={fileName}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              <Download className="w-5 h-5" />
              Download to View
            </a>
          </div>
        )}
      </div>

      {/* Controls for images */}
      {isImage && (
        <div className="absolute bottom-8 flex items-center gap-4 bg-black/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10">
          <button 
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
            className="text-white hover:text-blue-400 p-1 transition-colors"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-white text-sm font-bold w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button 
            onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
            className="text-white hover:text-blue-400 p-1 transition-colors"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="w-px h-4 bg-white/20 mx-2" />
          <button 
            onClick={() => setZoom(1)}
            className="text-white hover:text-blue-400 text-xs font-bold transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
