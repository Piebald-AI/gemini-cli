/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { Content } from '@google/genai';
import type { SlashCommand, MessageActionReturn } from './types.js';
import { CommandKind } from './types.js';

export function serializeHistoryToMarkdown(history: Content[]): string {
  return history
    .map((item) => {
      const text =
        item.parts
          ?.filter((m) => !!m.text)
          .map((m) => m.text)
          .join('') || '';
      return `**${item.role}**:\n\n${text}`;
    })
    .join('\n\n---\n\n');
}

export const shareCommand: SlashCommand = {
  name: 'share',
  description:
    'Share the current conversation to a markdown or json file. Usage: /share <file>',
  kind: CommandKind.BUILT_IN,
  action: async (context, args): Promise<MessageActionReturn> => {
    let filePathArg = args.trim();
    if (!filePathArg) {
      filePathArg = `gemini-conversation-${Date.now()}.json`;
    }

    const filePath = path.resolve(filePathArg);
    const extension = path.extname(filePath);
    if (extension !== '.md' && extension !== '.json') {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Invalid file format. Only .md and .json are supported.',
      };
    }

    const chat = await context.services.config?.getGeminiClient()?.getChat();
    if (!chat) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'No chat client available to share conversation.',
      };
    }

    const history = chat.getHistory();

    // An empty conversation has two hidden messages that setup the context for
    // the chat. Thus, to check whether a conversation has been started, we
    // can't check for length 0.
    if (history.length <= 2) {
      return {
        type: 'message',
        messageType: 'info',
        content: 'No conversation found to share.',
      };
    }

    let content = '';
    if (extension === '.json') {
      content = JSON.stringify(history, null, 2);
    } else {
      content = serializeHistoryToMarkdown(history);
    }

    try {
      await fsPromises.writeFile(filePath, content);
      return {
        type: 'message',
        messageType: 'info',
        content: `Conversation shared to ${filePath}`,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        type: 'message',
        messageType: 'error',
        content: `Error sharing conversation: ${errorMessage}`,
      };
    }
  },
};
