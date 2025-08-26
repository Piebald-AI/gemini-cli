/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Config,
  ToolCallRequestInfo,
  ToolCallRecord,
  ResumedSessionData,
} from '@google/gemini-cli-core';
import {
  executeToolCall,
  shutdownTelemetry,
  isTelemetrySdkInitialized,
  GeminiEventType,
  parseAndFormatApiError,
} from '@google/gemini-cli-core';
import type { Content, Part } from '@google/genai';

import { convertSessionToHistoryFormats } from './ui/hooks/useSessionBrowser.js';
import { ConsolePatcher } from './ui/utils/ConsolePatcher.js';
import { handleAtCommand } from './ui/hooks/atCommandProcessor.js';

export async function runNonInteractive(
  config: Config,
  input: string,
  prompt_id: string,
  resumedSessionData?: ResumedSessionData,
): Promise<void> {
  const consolePatcher = new ConsolePatcher({
    stderr: true,
    debugMode: config.getDebugMode(),
  });

  try {
    consolePatcher.patch();
    // Handle EPIPE errors when the output is piped to a command that closes early.
    process.stdout.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EPIPE') {
        // Exit gracefully if the pipe is closed.
        process.exit(0);
      }
    });

    const geminiClient = config.getGeminiClient();

    // Initialize chat.  Resume if resume data is passed.
    if (resumedSessionData) {
      await geminiClient.resumeChat(
        convertSessionToHistoryFormats(resumedSessionData.conversation.messages)
          .clientHistory,
        resumedSessionData,
      );
    }

    const abortController = new AbortController();

    const { processedQuery, shouldProceed } = await handleAtCommand({
      query: input,
      config,
      addItem: (_item, _timestamp) => 0,
      onDebugMessage: () => {},
      messageId: Date.now(),
      signal: abortController.signal,
    });

    if (!shouldProceed || !processedQuery) {
      // An error occurred during @include processing (e.g., file not found).
      // The error message is already logged by handleAtCommand.
      console.error('Exiting due to an error processing the @ command.');
      process.exit(1);
    }

    let currentMessages: Content[] = [
      { role: 'user', parts: processedQuery as Part[] },
    ];

    let turnCount = 0;
    while (true) {
      turnCount++;
      if (
        config.getMaxSessionTurns() >= 0 &&
        turnCount > config.getMaxSessionTurns()
      ) {
        console.error(
          '\n Reached max session turns for this session. Increase the number of turns by specifying maxSessionTurns in settings.json.',
        );
        return;
      }
      let fullResponseText = '';
      const toolCallRequests: ToolCallRequestInfo[] = [];

      const responseStream = geminiClient.sendMessageStream(
        currentMessages[0]?.parts || [],
        abortController.signal,
        prompt_id,
      );

      for await (const event of responseStream) {
        if (abortController.signal.aborted) {
          console.error('Operation cancelled.');
          return;
        }

        if (event.type === GeminiEventType.Content) {
          process.stdout.write(event.value);
          fullResponseText += event.value;
        } else if (event.type === GeminiEventType.ToolCallRequest) {
          toolCallRequests.push(event.value);
        } else if (event.type === GeminiEventType.Finished) {
          // Token recording now handled in GeminiChat
        }
      }

      // Model response recording now handled in GeminiChat

      if (toolCallRequests.length > 0) {
        // Record tool calls (non-interactive mode handles tools directly, not via CoreToolScheduler)
        const toolCallRecords: ToolCallRecord[] = toolCallRequests.map(
          (tc) => ({
            id: tc.callId ?? `${tc.name}-${Date.now()}`,
            name: tc.name as string,
            args: tc.args ?? {},
            status: 'executing',
            timestamp: new Date().toISOString(),
            displayName: tc.name as string,
          }),
        );

        const toolResponseParts: Part[] = [];
        for (let i = 0; i < toolCallRequests.length; ++i) {
          const requestInfo = toolCallRequests[i];
          const toolCallRecord = toolCallRecords[i];

          const toolResponse = await executeToolCall(
            config,
            requestInfo,
            abortController.signal,
          );

          // Update the saved tool call record's status and other properties.
          toolCallRecord.status = toolResponse.error ? 'error' : 'success';
          toolCallRecord.result = toolResponse.error
            ? undefined
            : toolResponse.responseParts;
          toolCallRecord.resultDisplay =
            typeof toolResponse.resultDisplay === 'string'
              ? toolResponse.resultDisplay
              : undefined;

          // Tool call error handling.
          if (toolResponse.error) {
            console.error(
              `Error executing tool ${requestInfo.name}: ${toolResponse.resultDisplay || toolResponse.error.message}`,
            );
          }

          if (toolResponse.responseParts) {
            toolResponseParts.push(...toolResponse.responseParts);
          }
        }

        // Record final tool call states after execution
        const chatRecordingService = geminiClient.getChatRecordingService();
        if (chatRecordingService) {
          chatRecordingService.recordToolCalls(toolCallRecords);
        }
        currentMessages = [{ role: 'user', parts: toolResponseParts }];
      } else {
        process.stdout.write('\n'); // Ensure a final newline
        return;
      }
    }
  } catch (error) {
    console.error(
      parseAndFormatApiError(
        error,
        config.getContentGeneratorConfig()?.authType,
      ),
    );
    process.exit(1);
  } finally {
    consolePatcher.cleanup();
    if (isTelemetrySdkInitialized()) {
      await shutdownTelemetry(config);
    }
  }
}
