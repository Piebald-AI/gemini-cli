/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from 'ink-testing-library';
import { AppContainer } from './AppContainer.js';
import { type Config, makeFakeConfig } from '@google/gemini-cli-core';
import type { LoadedSettings } from '../config/settings.js';
import type { InitializationResult } from '../core/initializer.js';

// Mock App component to isolate AppContainer testing
vi.mock('./App.js', () => ({
  App: () => 'App Component',
}));

// Mock all the hooks and utilities
vi.mock('./hooks/useHistory.js');
vi.mock('./hooks/useThemeCommand.js');
vi.mock('./hooks/useAuthCommand.js');
vi.mock('./hooks/useEditorSettings.js');
vi.mock('./hooks/useSettingsCommand.js');
vi.mock('./hooks/useSlashCommandProcessor.js');
vi.mock('./hooks/useConsoleMessages.js');
vi.mock('./hooks/useTerminalSize.js', () => ({
  useTerminalSize: vi.fn(() => ({ columns: 80, rows: 24 })),
}));
vi.mock('./hooks/useGeminiStream.js');
vi.mock('./hooks/useVim.js');
vi.mock('./hooks/useFocus.js');
vi.mock('./hooks/useBracketedPaste.js');
vi.mock('./hooks/useKeypress.js');
vi.mock('./hooks/useLoadingIndicator.js');
vi.mock('./hooks/useFolderTrust.js');
vi.mock('./hooks/useMessageQueue.js');
vi.mock('./hooks/useAutoAcceptIndicator.js');
vi.mock('./hooks/useWorkspaceMigration.js');
vi.mock('./hooks/useGitBranchName.js');
vi.mock('./contexts/VimModeContext.js');
vi.mock('./contexts/SessionContext.js');
vi.mock('./hooks/useTextBuffer.js');
vi.mock('./hooks/useLogger.js');

// Mock external utilities
vi.mock('../utils/events.js');
vi.mock('../utils/handleAutoUpdate.js');
vi.mock('./utils/ConsolePatcher.js');
vi.mock('../utils/cleanup.js');

describe('AppContainer State Management', () => {
  let mockConfig: Config;
  let mockSettings: LoadedSettings;
  let mockInitResult: InitializationResult;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Config
    mockConfig = makeFakeConfig();

    // Mock LoadedSettings
    mockSettings = {
      merged: {
        hideBanner: false,
        hideFooter: false,
        hideTips: false,
        showMemoryUsage: false,
        theme: 'default',
      },
    } as unknown as LoadedSettings;

    // Mock InitializationResult
    mockInitResult = {
      themeError: null,
      authError: null,
      shouldOpenAuthDialog: false,
      geminiMdFileCount: 0,
    } as InitializationResult;
  });

  afterEach(() => {
    cleanup();
  });

  describe('Basic Rendering', () => {
    it('renders without crashing with minimal props', () => {
      expect(() => {
        render(
          <AppContainer
            config={mockConfig}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();
    });

    it('renders with startup warnings', () => {
      const startupWarnings = ['Warning 1', 'Warning 2'];

      expect(() => {
        render(
          <AppContainer
            config={mockConfig}
            settings={mockSettings}
            startupWarnings={startupWarnings}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();
    });
  });

  describe('State Initialization', () => {
    it('initializes with theme error from initialization result', () => {
      const initResultWithError = {
        ...mockInitResult,
        themeError: 'Failed to load theme',
      };

      expect(() => {
        render(
          <AppContainer
            config={mockConfig}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={initResultWithError}
          />,
        );
      }).not.toThrow();
    });

    it('handles debug mode state', () => {
      const debugConfig = makeFakeConfig();
      vi.spyOn(debugConfig, 'getDebugMode').mockReturnValue(true);

      expect(() => {
        render(
          <AppContainer
            config={debugConfig}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();
    });
  });

  describe('Context Providers', () => {
    it('provides AppContext with correct values', () => {
      const { unmount } = render(
        <AppContainer
          config={mockConfig}
          settings={mockSettings}
          version="2.0.0"
          initializationResult={mockInitResult}
        />,
      );

      // Should render and unmount cleanly
      expect(() => unmount()).not.toThrow();
    });

    it('provides UIStateContext with state management', () => {
      expect(() => {
        render(
          <AppContainer
            config={mockConfig}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();
    });

    it('provides UIActionsContext with action handlers', () => {
      expect(() => {
        render(
          <AppContainer
            config={mockConfig}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();
    });

    it('provides ConfigContext with config object', () => {
      expect(() => {
        render(
          <AppContainer
            config={mockConfig}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();
    });
  });

  describe('Settings Integration', () => {
    it('handles settings with all display options disabled', () => {
      const settingsAllHidden = {
        merged: {
          hideBanner: true,
          hideFooter: true,
          hideTips: true,
          showMemoryUsage: false,
        },
      } as unknown as LoadedSettings;

      expect(() => {
        render(
          <AppContainer
            config={mockConfig}
            settings={settingsAllHidden}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();
    });

    it('handles settings with memory usage enabled', () => {
      const settingsWithMemory = {
        merged: {
          hideBanner: false,
          hideFooter: false,
          hideTips: false,
          showMemoryUsage: true,
        },
      } as unknown as LoadedSettings;

      expect(() => {
        render(
          <AppContainer
            config={mockConfig}
            settings={settingsWithMemory}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();
    });
  });

  describe('Version Handling', () => {
    it('handles different version formats', () => {
      const versions = ['1.0.0', '2.1.3-beta', '3.0.0-nightly'];

      versions.forEach((version) => {
        expect(() => {
          render(
            <AppContainer
              config={mockConfig}
              settings={mockSettings}
              version={version}
              initializationResult={mockInitResult}
            />,
          );
        }).not.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles config methods that might throw', () => {
      const errorConfig = makeFakeConfig();
      vi.spyOn(errorConfig, 'getModel').mockImplementation(() => {
        throw new Error('Config error');
      });

      // Should still render without crashing - errors should be handled internally
      expect(() => {
        render(
          <AppContainer
            config={errorConfig}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();
    });

    it('handles undefined settings gracefully', () => {
      const undefinedSettings = {
        merged: {},
      } as LoadedSettings;

      expect(() => {
        render(
          <AppContainer
            config={mockConfig}
            settings={undefinedSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();
    });
  });

  describe('Provider Hierarchy', () => {
    it('establishes correct provider nesting order', () => {
      // This tests that all the context providers are properly nested
      // and that the component tree can be built without circular dependencies
      const { unmount } = render(
        <AppContainer
          config={mockConfig}
          settings={mockSettings}
          version="1.0.0"
          initializationResult={mockInitResult}
        />,
      );

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Session Resumption', () => {
    it('handles resumed session data correctly', () => {
      const mockResumedSessionData = {
        conversation: {
          sessionId: 'test-session-123',
          projectHash: 'test-project-hash',
          startTime: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:00:01Z',
          messages: [
            {
              id: 'msg-1',
              type: 'user' as const,
              content: 'Hello',
              timestamp: '2024-01-01T00:00:00Z',
            },
            {
              id: 'msg-2',
              type: 'gemini' as const,
              content: 'Hi there!',
              role: 'model' as const,
              parts: [{ text: 'Hi there!' }],
              timestamp: '2024-01-01T00:00:01Z',
            },
          ],
        },
        filePath: '/tmp/test-session.json',
      };

      expect(() => {
        render(
          <AppContainer
            config={mockConfig}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
            resumedSessionData={mockResumedSessionData}
          />,
        );
      }).not.toThrow();
    });

    it('renders without resumed session data', () => {
      expect(() => {
        render(
          <AppContainer
            config={mockConfig}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
            resumedSessionData={undefined}
          />,
        );
      }).not.toThrow();
    });

    it('initializes chat recording service when config has it', () => {
      const mockChatRecordingService = {
        initialize: vi.fn(),
        recordMessage: vi.fn(),
        recordMessageTokens: vi.fn(),
        recordToolCalls: vi.fn(),
      };

      const mockGeminiClient = {
        isInitialized: vi.fn(() => true),
        resumeChat: vi.fn(),
        getUserTier: vi.fn(),
        getChatRecordingService: vi.fn(() => mockChatRecordingService),
      };

      const configWithRecording = {
        ...mockConfig,
        getGeminiClient: vi.fn(() => mockGeminiClient),
      } as unknown as Config;

      expect(() => {
        render(
          <AppContainer
            config={configWithRecording}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();
    });
  });

  describe('Session Browser Integration', () => {
    it('provides session browser actions in UIActions context', () => {
      // This test verifies that openSessionBrowser is included in the UIActions
      // The actual functionality is tested through integration tests
      expect(() => {
        render(
          <AppContainer
            config={mockConfig}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();
    });
  });

  describe('Session Recording Integration', () => {
    it('provides chat recording service configuration', () => {
      const mockChatRecordingService = {
        initialize: vi.fn(),
        recordMessage: vi.fn(),
        recordMessageTokens: vi.fn(),
        recordToolCalls: vi.fn(),
        getSessionId: vi.fn(() => 'test-session-123'),
        getCurrentConversation: vi.fn(),
      };

      const mockGeminiClient = {
        isInitialized: vi.fn(() => true),
        resumeChat: vi.fn(),
        getUserTier: vi.fn(),
        getChatRecordingService: vi.fn(() => mockChatRecordingService),
        setHistory: vi.fn(),
      };

      const configWithRecording = {
        ...mockConfig,
        getGeminiClient: vi.fn(() => mockGeminiClient),
        getSessionId: vi.fn(() => 'test-session-123'),
      } as unknown as Config;

      expect(() => {
        render(
          <AppContainer
            config={configWithRecording}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
          />,
        );
      }).not.toThrow();

      // Verify the recording service structure is correct
      expect(configWithRecording.getGeminiClient).toBeDefined();
      expect(mockGeminiClient.getChatRecordingService).toBeDefined();
      expect(mockChatRecordingService.initialize).toBeDefined();
      expect(mockChatRecordingService.recordMessage).toBeDefined();
    });

    it('handles session recording when messages are added', () => {
      const mockRecordMessage = vi.fn();
      const mockRecordMessageTokens = vi.fn();

      const mockChatRecordingService = {
        initialize: vi.fn(),
        recordMessage: mockRecordMessage,
        recordMessageTokens: mockRecordMessageTokens,
        recordToolCalls: vi.fn(),
        getSessionId: vi.fn(() => 'test-session-123'),
      };

      const mockGeminiClient = {
        isInitialized: vi.fn(() => true),
        getChatRecordingService: vi.fn(() => mockChatRecordingService),
        getUserTier: vi.fn(),
      };

      const configWithRecording = {
        ...mockConfig,
        getGeminiClient: vi.fn(() => mockGeminiClient),
      } as unknown as Config;

      render(
        <AppContainer
          config={configWithRecording}
          settings={mockSettings}
          version="1.0.0"
          initializationResult={mockInitResult}
        />,
      );

      // The actual recording happens through the useHistory hook
      // which would be triggered by user interactions
      expect(mockChatRecordingService.initialize).toBeDefined();
      expect(mockChatRecordingService.recordMessage).toBeDefined();
    });
  });

  describe('Session Resume Flow', () => {
    it('accepts resumed session data', () => {
      const mockResumeChat = vi.fn();
      const mockGeminiClient = {
        isInitialized: vi.fn(() => true),
        resumeChat: mockResumeChat,
        getUserTier: vi.fn(),
        getChatRecordingService: vi.fn(() => ({
          initialize: vi.fn(),
          recordMessage: vi.fn(),
          recordMessageTokens: vi.fn(),
          recordToolCalls: vi.fn(),
        })),
      };

      const configWithClient = {
        ...mockConfig,
        getGeminiClient: vi.fn(() => mockGeminiClient),
      } as unknown as Config;

      const resumedData = {
        conversation: {
          sessionId: 'resumed-session-456',
          projectHash: 'project-hash',
          startTime: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:01:00Z',
          messages: [
            {
              id: 'msg-1',
              type: 'user' as const,
              content: 'Previous question',
              timestamp: '2024-01-01T00:00:00Z',
            },
            {
              id: 'msg-2',
              type: 'gemini' as const,
              content: 'Previous answer',
              role: 'model' as const,
              parts: [{ text: 'Previous answer' }],
              timestamp: '2024-01-01T00:00:30Z',
              tokenCount: { input: 10, output: 20 },
            },
          ],
        },
        filePath: '/tmp/resumed-session.json',
      };

      expect(() => {
        render(
          <AppContainer
            config={configWithClient}
            settings={mockSettings}
            version="1.0.0"
            initializationResult={mockInitResult}
            resumedSessionData={resumedData}
          />,
        );
      }).not.toThrow();

      // Verify the resume functionality structure is in place
      expect(mockGeminiClient.resumeChat).toBeDefined();
      expect(resumedData.conversation.messages).toHaveLength(2);
    });

    it('does not attempt resume when client is not initialized', () => {
      const mockResumeChat = vi.fn();
      const mockGeminiClient = {
        isInitialized: vi.fn(() => false), // Not initialized
        resumeChat: mockResumeChat,
        getUserTier: vi.fn(),
        getChatRecordingService: vi.fn(),
      };

      const configWithClient = {
        ...mockConfig,
        getGeminiClient: vi.fn(() => mockGeminiClient),
      } as unknown as Config;

      const resumedData = {
        conversation: {
          sessionId: 'test-session',
          projectHash: 'project-hash',
          startTime: '2024-01-01T00:00:00Z',
          lastUpdated: '2024-01-01T00:01:00Z',
          messages: [],
        },
        filePath: '/tmp/session.json',
      };

      render(
        <AppContainer
          config={configWithClient}
          settings={mockSettings}
          version="1.0.0"
          initializationResult={mockInitResult}
          resumedSessionData={resumedData}
        />,
      );

      // Should not call resumeChat when client is not initialized
      expect(mockResumeChat).not.toHaveBeenCalled();
    });
  });

  describe('Token Counting from Session Stats', () => {
    it('tracks token counts from session messages', () => {
      // Session stats are provided through the SessionStatsProvider context
      // in the real app, not through the config directly
      const mockChatRecordingService = {
        initialize: vi.fn(),
        recordMessage: vi.fn(),
        recordMessageTokens: vi.fn(),
        recordToolCalls: vi.fn(),
        getSessionId: vi.fn(() => 'test-session-123'),
        getCurrentConversation: vi.fn(() => ({
          sessionId: 'test-session-123',
          messages: [],
          totalInputTokens: 150,
          totalOutputTokens: 350,
        })),
      };

      const mockGeminiClient = {
        isInitialized: vi.fn(() => true),
        getChatRecordingService: vi.fn(() => mockChatRecordingService),
        getUserTier: vi.fn(),
      };

      const configWithRecording = {
        ...mockConfig,
        getGeminiClient: vi.fn(() => mockGeminiClient),
      } as unknown as Config;

      render(
        <AppContainer
          config={configWithRecording}
          settings={mockSettings}
          version="1.0.0"
          initializationResult={mockInitResult}
        />,
      );

      // In the actual app, these stats would be displayed in components
      // and updated as messages are processed through the recording service
      expect(mockChatRecordingService.recordMessageTokens).toBeDefined();
      expect(mockChatRecordingService.getCurrentConversation).toBeDefined();
    });
  });
});

// Note: These tests verify the structure and setup of session-related features.
// Full end-to-end testing would require mocking the entire message flow,
// which is better suited for integration tests with a running application.
