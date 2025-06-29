import React, { useState, useEffect } from 'react';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ChatInterface } from './components/ChatInterface';
import { FloatingDetectionButton } from './components/FloatingDetectionButton';
import { ExportProgress } from './components/ExportProgress';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useClaudeDetection } from './hooks/useClaudeDetection';
import { AnthropicAPI } from './services/anthropicApi';
import { GoogleDriveService } from './services/googleDrive';
import { Conversation, Message, Settings, ExportProgress as ExportProgressType } from './types';
import { v4 as uuidv4 } from 'uuid';

const defaultSettings: Settings = {
  theme: 'light',
  googleDriveEnabled: false,
  autoExportEnabled: true,
  exportInterval: 15,
  notificationsEnabled: true,
  deviceName: 'My Device'
};

function App() {
  const [settings, setSettings] = useLocalStorage<Settings>('claude-copier-settings', defaultSettings);
  const [conversations, setConversations] = useLocalStorage<Conversation[]>('claude-copier-conversations', []);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgressType>({ status: 'idle', progress: 0 });
  
  const { detectionResult, isMonitoring, startMonitoring, stopMonitoring, clearDetection } = useClaudeDetection();
  
  const [anthropicApi, setAnthropicApi] = useState<AnthropicAPI | null>(null);
  const [googleDriveService] = useState(() => new GoogleDriveService());

  // Initialize Anthropic API when API key is available
  useEffect(() => {
    if (settings.anthropicApiKey) {
      setAnthropicApi(new AnthropicAPI(settings.anthropicApiKey));
    }
  }, [settings.anthropicApiKey]);

  // Start monitoring when component mounts
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, [startMonitoring, stopMonitoring]);

  // Apply theme
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const createNewConversation = (): Conversation => ({
    id: uuidv4(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    exportCount: 0,
    tags: []
  });

  const handleNewConversation = () => {
    const newConversation = createNewConversation();
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const updateConversationTitle = (conversation: Conversation, firstMessage: string) => {
    const title = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...'
      : firstMessage;
    
    return { ...conversation, title, updatedAt: new Date() };
  };

  const handleSendMessage = async (content: string) => {
    if (!anthropicApi) {
      // Show setup prompt
      alert('Please configure your Anthropic API key in settings to use unlimited chat.');
      return;
    }

    let conversation = activeConversation;
    if (!conversation) {
      conversation = createNewConversation();
      setConversations(prev => [conversation!, ...prev]);
      setActiveConversationId(conversation.id);
    }

    const userMessage: Message = {
      id: uuidv4(),
      content,
      role: 'user',
      timestamp: new Date(),
      status: 'sent'
    };

    // Update conversation with user message
    const updatedConversation = {
      ...conversation,
      messages: [...conversation.messages, userMessage],
      updatedAt: new Date()
    };

    // Update title if this is the first message
    const finalConversation = conversation.messages.length === 0
      ? updateConversationTitle(updatedConversation, content)
      : updatedConversation;

    setConversations(prev => 
      prev.map(c => c.id === finalConversation.id ? finalConversation : c)
    );

    setIsLoading(true);

    try {
      const assistantMessage: Message = {
        id: uuidv4(),
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        status: 'sending'
      };

      // Add placeholder message
      setConversations(prev => 
        prev.map(c => 
          c.id === finalConversation.id 
            ? { ...c, messages: [...c.messages, assistantMessage] }
            : c
        )
      );

      const messages = [...finalConversation.messages, userMessage];
      let responseContent = '';

      // Stream the response
      for await (const chunk of anthropicApi.streamMessage(messages)) {
        responseContent += chunk;
        
        setConversations(prev => 
          prev.map(c => 
            c.id === finalConversation.id 
              ? {
                  ...c,
                  messages: c.messages.map(msg => 
                    msg.id === assistantMessage.id
                      ? { ...msg, content: responseContent, status: 'sent' }
                      : msg
                  )
                }
              : c
          )
        );
      }

      // Check if auto-export should be triggered
      const updatedMessages = [...finalConversation.messages, userMessage, { ...assistantMessage, content: responseContent, status: 'sent' as const }];
      if (settings.autoExportEnabled && updatedMessages.length % settings.exportInterval === 0) {
        handleExportConversation(finalConversation.id);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      // Update message status to error
      setConversations(prev => 
        prev.map(c => 
          c.id === finalConversation.id 
            ? {
                ...c,
                messages: c.messages.map(msg => 
                  msg.role === 'assistant' && msg.content === ''
                    ? { ...msg, content: 'Sorry, there was an error processing your message.', status: 'error' }
                    : msg
                )
              }
            : c
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportConversation = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    setExportProgress({ status: 'preparing', progress: 0 });

    try {
      if (!googleDriveService.isAuthenticated()) {
        const authenticated = await googleDriveService.authenticate();
        if (!authenticated) {
          throw new Error('Google Drive authentication failed');
        }
      }

      setExportProgress({ status: 'uploading', progress: 25 });

      const exportContent = JSON.stringify({
        title: conversation.title,
        messages: conversation.messages,
        exportedAt: new Date().toISOString(),
        messageCount: conversation.messages.length
      }, null, 2);

      setExportProgress({ status: 'uploading', progress: 75 });

      const fileName = `claude-conversation-${conversation.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;
      const result = await googleDriveService.uploadFile(exportContent, fileName);

      setExportProgress({ 
        status: 'complete', 
        progress: 100, 
        fileName,
        fileUrl: result.webViewLink 
      });

      // Update conversation export count
      setConversations(prev =>
        prev.map(c => 
          c.id === conversationId 
            ? { ...c, exportCount: c.exportCount + 1 }
            : c
        )
      );

    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress({ 
        status: 'error', 
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleDetectionAction = (action: 'export' | 'continue' | 'new-chat' | 'dismiss') => {
    switch (action) {
      case 'export':
        if (activeConversationId) {
          handleExportConversation(activeConversationId);
        }
        break;
      case 'new-chat':
        handleNewConversation();
        break;
      case 'continue':
        // Open the unlimited chat interface
        break;
      case 'dismiss':
        clearDetection();
        break;
    }
  };

  const handleToggleTheme = () => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light'
    }));
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onToggleTheme={handleToggleTheme}
        isDark={settings.theme === 'dark'}
      />
      
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <ChatInterface
            messages={activeConversation.messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Welcome to Claude Copier
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
                Your unlimited Claude AI interface with smart detection and automatic export capabilities.
              </p>
              <button
                onClick={handleNewConversation}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Start New Conversation
              </button>
            </div>
          </div>
        )}
      </div>

      {detectionResult && (
        <FloatingDetectionButton
          detection={detectionResult}
          onAction={handleDetectionAction}
        />
      )}

      <ExportProgress
        progress={exportProgress}
        onClose={() => setExportProgress({ status: 'idle', progress: 0 })}
      />
    </div>
  );
}

export default App;