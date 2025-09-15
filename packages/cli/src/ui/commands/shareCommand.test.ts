/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Mocked } from 'vitest';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { CommandContext } from './types.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import type { Content } from '@google/genai';
import type { GeminiClient } from '@google/gemini-cli-core';

import * as fsPromises from 'node:fs/promises';
import { shareCommand, serializeHistoryToMarkdown } from './shareCommand.js';
import path from 'node:path';

vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
}));

describe('shareCommand', () => {
  const mockFs = fsPromises as Mocked<typeof fsPromises>;

  let mockContext: CommandContext;
  let mockGetChat: ReturnType<typeof vi.fn>;
  let mockGetHistory: ReturnType<typeof vi.fn>;

  const mockHistory = [
    { role: 'user', parts: [{ text: 'context' }] },
    { role: 'model', parts: [{ text: 'context response' }] },
    { role: 'user', parts: [{ text: 'Hello' }] },
    { role: 'model', parts: [{ text: 'Hi there!' }] },
  ];

  beforeEach(() => {
    mockGetHistory = vi.fn().mockReturnValue([]);
    mockGetChat = vi.fn().mockResolvedValue({
      getHistory: mockGetHistory,
    });

    mockContext = createMockCommandContext({
      services: {
        config: {
          getProjectRoot: () => '/project/root',
          getGeminiClient: () =>
            ({
              getChat: mockGetChat,
            }) as unknown as GeminiClient,
        },
      },
    });

    vi.spyOn(process, 'cwd').mockReturnValue(
      path.resolve('/usr/local/google/home/myuser/gemini-cli'),
    );
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    mockGetHistory.mockReturnValue(mockHistory);
    mockFs.writeFile.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have the correct command definition', () => {
    expect(shareCommand.name).toBe('share');
    expect(shareCommand.description).toBe(
      'Share the current conversation to a markdown or json file. Usage: /share <file>',
    );
  });

  it('should default to a json file if no path is provided', async () => {
    const result = await shareCommand?.action?.(mockContext, '');
    const expectedPath = path.join(
      process.cwd(),
      'gemini-conversation-1234567890.json',
    );
    const [actualPath, actualContent] = mockFs.writeFile.mock.calls[0];
    expect(typeof actualContent).toBe('string');
    expect(actualPath).toEqual(expectedPath);
    expect(actualContent).toEqual(JSON.stringify(mockHistory, null, 2));
    expect(result).toEqual({
      type: 'message',
      messageType: 'info',
      content: `Conversation shared to ${expectedPath}`,
    });
  });

  it('should share the conversation to a JSON file', async () => {
    const filePath = 'my-chat.json';
    const result = await shareCommand?.action?.(mockContext, filePath);
    const expectedPath = path.join(process.cwd(), 'my-chat.json');
    const [actualPath, actualContent] = mockFs.writeFile.mock.calls[0];
    expect(typeof actualContent).toBe('string');
    expect(actualPath).toEqual(expectedPath);
    expect(actualContent).toEqual(JSON.stringify(mockHistory, null, 2));
    expect(result).toEqual({
      type: 'message',
      messageType: 'info',
      content: `Conversation shared to ${expectedPath}`,
    });
  });

  it('should share the conversation to a Markdown file', async () => {
    const filePath = 'my-chat.md';
    const result = await shareCommand?.action?.(mockContext, filePath);
    const expectedPath = path.join(process.cwd(), 'my-chat.md');
    const [actualPath, actualContent] = mockFs.writeFile.mock.calls[0];
    expect(typeof actualContent).toBe('string');
    expect(actualPath).toEqual(expectedPath);
    const expectedContent =
      '**user**:\n\ncontext\n\n---\n\n' +
      '**model**:\n\ncontext response\n\n---\n\n' +
      '**user**:\n\nHello\n\n---\n\n' +
      '**model**:\n\nHi there!';
    expect(actualContent).toEqual(expectedContent);
    expect(result).toEqual({
      type: 'message',
      messageType: 'info',
      content: `Conversation shared to ${expectedPath}`,
    });
  });

  it('should return an error for unsupported file extensions', async () => {
    const filePath = 'my-chat.txt';
    const result = await shareCommand?.action?.(mockContext, filePath);
    expect(mockFs.writeFile).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: 'message',
      messageType: 'error',
      content: 'Invalid file format. Only .md and .json are supported.',
    });
  });

  it('should inform if there is no conversation to share', async () => {
    mockGetHistory.mockReturnValue([
      { role: 'user', parts: [{ text: 'context' }] },
      { role: 'model', parts: [{ text: 'context response' }] },
    ]);
    const result = await shareCommand?.action?.(mockContext, 'my-chat.json');
    expect(mockFs.writeFile).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: 'message',
      messageType: 'info',
      content: 'No conversation found to share.',
    });
  });

  it('should handle errors during file writing', async () => {
    const error = new Error('Permission denied');
    mockFs.writeFile.mockRejectedValue(error);
    const result = await shareCommand?.action?.(mockContext, 'my-chat.json');
    expect(result).toEqual({
      type: 'message',
      messageType: 'error',
      content: `Error sharing conversation: ${error.message}`,
    });
  });

  it('should output valid JSON schema', async () => {
    const filePath = 'my-chat.json';
    await shareCommand?.action?.(mockContext, filePath);
    const expectedPath = path.join(process.cwd(), 'my-chat.json');
    const [actualPath, actualContent] = mockFs.writeFile.mock.calls[0];
    expect(typeof actualContent).toBe('string');
    expect(actualPath).toEqual(expectedPath);
    const parsedContent = JSON.parse(actualContent as string);
    expect(Array.isArray(parsedContent)).toBe(true);
    parsedContent.forEach((item: Content) => {
      expect(item).toHaveProperty('role');
      expect(item).toHaveProperty('parts');
      expect(Array.isArray(item.parts)).toBe(true);
    });
  });

  it('should output correct markdown format', async () => {
    const filePath = 'my-chat.md';
    await shareCommand?.action?.(mockContext, filePath);
    const expectedPath = path.join(process.cwd(), 'my-chat.md');
    const [actualPath, actualContent] = mockFs.writeFile.mock.calls[0];
    expect(typeof actualContent).toBe('string');
    expect(actualPath).toEqual(expectedPath);
    const entries = (actualContent as string).split('\n\n---\n\n');
    expect(entries.length).toBe(mockHistory.length);
    entries.forEach((entry: string, index: number) => {
      const { role, parts } = mockHistory[index];
      const text = parts.map((p) => p.text).join('');
      expect(entry).toBe(`**${role}**:\n\n${text}`);
    });
  });
});

describe('serializeHistoryToMarkdown', () => {
  it('should correctly serialize chat history to Markdown', () => {
    const history: Content[] = [
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Hi there!' }] },
      { role: 'user', parts: [{ text: 'How are you?' }] },
    ];

    const expectedMarkdown =
      '**user**:\n\nHello\n\n---\n\n' +
      '**model**:\n\nHi there!\n\n---\n\n' +
      '**user**:\n\nHow are you?';

    const result = serializeHistoryToMarkdown(history);
    expect(result).toBe(expectedMarkdown);
  });

  it('should handle empty history', () => {
    const history: Content[] = [];
    const result = serializeHistoryToMarkdown(history);
    expect(result).toBe('');
  });

  it('should handle items with no text parts', () => {
    const history: Content[] = [
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [] },
      { role: 'user', parts: [{ text: 'How are you?' }] },
    ];

    const expectedMarkdown =
      '**user**:\n\nHello\n\n---\n\n' +
      '**model**:\n\n\n\n---\n\n' +
      '**user**:\n\nHow are you?';

    const result = serializeHistoryToMarkdown(history);
    expect(result).toBe(expectedMarkdown);
  });
});
