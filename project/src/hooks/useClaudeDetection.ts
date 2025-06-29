import { useState, useEffect, useCallback } from 'react';
import { DetectionResult } from '../types';

const LIMIT_PATTERNS = [
  /claude hit the maximum length/i,
  /conversation has reached its limit/i,
  /please start a new conversation/i,
  /maximum conversation length/i,
  /conversation limit reached/i,
  /too many messages/i
];

export function useClaudeDetection() {
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const analyzeContent = useCallback((text: string): DetectionResult => {
    let maxConfidence = 0;
    let triggerText = '';
    
    for (const pattern of LIMIT_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        const confidence = 0.9; // High confidence for direct pattern matches
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          triggerText = match[0];
        }
      }
    }

    // Check for contextual indicators
    const contextualIndicators = [
      /start.*new.*conversation/i,
      /continue.*elsewhere/i,
      /conversation.*full/i
    ];

    for (const pattern of contextualIndicators) {
      const match = text.match(pattern);
      if (match) {
        const confidence = 0.7; // Medium confidence for contextual matches
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          triggerText = match[0];
        }
      }
    }

    return {
      isLimitReached: maxConfidence > 0.6,
      confidence: maxConfidence,
      triggerText,
      suggestedAction: maxConfidence > 0.8 ? 'export' : 'continue'
    };
  }, []);

  const monitorPage = useCallback(() => {
    if (!isMonitoring) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          for (const node of addedNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
              const result = analyzeContent(node.textContent || '');
              if (result.isLimitReached) {
                setDetectionResult(result);
                return;
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              const text = element.textContent || '';
              const result = analyzeContent(text);
              if (result.isLimitReached) {
                setDetectionResult(result);
                return;
              }
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => observer.disconnect();
  }, [isMonitoring, analyzeContent]);

  useEffect(() => {
    const cleanup = monitorPage();
    return cleanup;
  }, [monitorPage]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    setDetectionResult(null);
  }, []);

  const clearDetection = useCallback(() => {
    setDetectionResult(null);
  }, []);

  return {
    detectionResult,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearDetection
  };
}