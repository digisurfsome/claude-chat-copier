export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  artifacts?: Artifact[];
  status?: 'sending' | 'sent' | 'error';
}

export interface Artifact {
  id: string;
  type: 'code' | 'json' | 'html' | 'text';
  content: string;
  language?: string;
  title?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  exportCount: number;
  tags: string[];
}

export interface Settings {
  theme: 'light' | 'dark';
  anthropicApiKey?: string;
  googleDriveEnabled: boolean;
  autoExportEnabled: boolean;
  exportInterval: number;
  notificationsEnabled: boolean;
  deviceName: string;
}

export interface DetectionResult {
  isLimitReached: boolean;
  confidence: number;
  triggerText: string;
  suggestedAction: 'export' | 'continue' | 'new-chat';
}

export interface ExportProgress {
  status: 'idle' | 'preparing' | 'uploading' | 'complete' | 'error';
  progress: number;
  fileName?: string;
  fileUrl?: string;
  error?: string;
}