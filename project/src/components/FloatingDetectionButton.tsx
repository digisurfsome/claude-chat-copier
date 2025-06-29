import React from 'react';
import { AlertTriangle, Download, MessageSquare, X } from 'lucide-react';
import { DetectionResult } from '../types';

interface Props {
  detection: DetectionResult;
  onAction: (action: 'export' | 'continue' | 'new-chat' | 'dismiss') => void;
  className?: string;
}

export function FloatingDetectionButton({ detection, onAction, className = '' }: Props) {
  if (!detection.isLimitReached) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-50 animate-slide-up ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-warning-100 dark:bg-warning-900 rounded-full flex items-center justify-center animate-pulse-slow">
              <AlertTriangle className="w-4 h-4 text-warning-600 dark:text-warning-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Limit Detected
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Confidence: {Math.round(detection.confidence * 100)}%
              </p>
            </div>
          </div>
          <button
            onClick={() => onAction('dismiss')}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Claude conversation limit reached. What would you like to do?
        </p>

        <div className="flex space-x-2">
          <button
            onClick={() => onAction('export')}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
          <button
            onClick={() => onAction('new-chat')}
            className="flex-1 bg-success-600 hover:bg-success-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
          >
            <MessageSquare className="w-3 h-3" />
            <span>New Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}