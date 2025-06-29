import React from 'react';
import { CheckCircle, AlertCircle, Upload, X } from 'lucide-react';
import { ExportProgress as ExportProgressType } from '../types';

interface Props {
  progress: ExportProgressType;
  onClose: () => void;
  className?: string;
}

export function ExportProgress({ progress, onClose, className = '' }: Props) {
  if (progress.status === 'idle') return null;

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'preparing':
      case 'uploading':
        return <Upload className="w-5 h-5 text-primary-600 animate-bounce" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-success-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-error-600" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'preparing':
        return 'Preparing export...';
      case 'uploading':
        return `Uploading to Google Drive... ${progress.progress}%`;
      case 'complete':
        return 'Export completed successfully!';
      case 'error':
        return `Export failed: ${progress.error}`;
      default:
        return '';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm animate-slide-down ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {getStatusText()}
            </p>
            {progress.fileName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {progress.fileName}
              </p>
            )}
          </div>
        </div>
        {(progress.status === 'complete' || progress.status === 'error') && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {progress.status === 'uploading' && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {progress.status === 'complete' && progress.fileUrl && (
        <div className="mt-3">
          <a
            href={progress.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View exported file →
          </a>
        </div>
      )}
    </div>
  );
}