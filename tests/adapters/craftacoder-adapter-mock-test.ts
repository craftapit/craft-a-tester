/**
 * CraftacoderAdapter Mock Test
 * 
 * This test verifies that the CraftacoderAdapter implementation works correctly
 * by mocking the API calls instead of hitting the actual API endpoint.
 */

import { CraftacoderAdapter } from '../../src/adapters/CraftacoderAdapter';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ScreenState } from '../../src/types/actions';

// Mock fetch globally
global.fetch = jest.fn();

describe('CraftacoderAdapter', () => {
  let adapter: CraftacoderAdapter;
  
  beforeEach(() => {
    adapter = new CraftacoderAdapter({
      apiKey: 'test-api-key',
      baseUrl: 'http://localhost:3000',
      model: 'claude-3-sonnet-20240229',
      provider: 'anthropic'
    });
    
    // Reset mocks between tests
    jest.clearAllMocks();
  });
  
  describe('initialize()', () => {
    it('should initialize without errors', async () => {
      await expect(adapter.initialize()).resolves.not.toThrow();
    });
    
    it('should throw error if apiKey is not provided', async () => {
      const badAdapter = new CraftacoderAdapter({
        apiKey: '',
        baseUrl: 'http://localhost:3000',
        model: 'claude-3-sonnet-20240229'
      });
      
      await expect(badAdapter.initialize()).rejects.toThrow('Craftacoder API key is required');
    });
  });
  
  describe('complete()', () => {
    const mockPrompt = 'What is TypeScript?';
    
    it('should handle anthropic provider responses', async () => {
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{ type: 'text', text: 'TypeScript is a strongly typed programming language.' }]
        })
      });
      
      const result = await adapter.complete(mockPrompt);
      
      expect(result).toEqual('TypeScript is a strongly typed programming language.');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/providers/anthropic/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key'
          }),
          body: expect.any(String)
        })
      );
    });
    
    it('should handle openai provider responses', async () => {
      // Create OpenAI adapter
      const openaiAdapter = new CraftacoderAdapter({
        apiKey: 'test-api-key',
        baseUrl: 'http://localhost:3000',
        model: 'gpt-4',
        provider: 'openai'
      });
      
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'TypeScript is a superset of JavaScript.' } }]
        })
      });
      
      const result = await openaiAdapter.complete(mockPrompt);
      
      expect(result).toEqual('TypeScript is a superset of JavaScript.');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/providers/openai/messages',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String)
        })
      );
    });
    
    it('should handle errors from the API', async () => {
      // Mock failed response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });
      
      await expect(adapter.complete(mockPrompt)).rejects.toThrow('Craftacoder API error: 401 Unauthorized');
    });
  });
  
  describe('suggestAction()', () => {
    const mockInstruction = 'Click the Submit button';
    const mockScreenState: ScreenState = {
      title: 'Test Form',
      url: 'https://example.com/form',
      elements: [
        { type: 'button', text: 'Submit', id: 'submit-btn' },
        { type: 'button', text: 'Cancel', id: 'cancel-btn' }
      ]
    };
    
    it('should suggest actions based on the instruction and screen state', async () => {
      // Mock a successful response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{ 
            type: 'text', 
            text: '```json\n{\n  "actionType": "click",\n  "target": {"id": "submit-btn"},\n  "reasoning": "The instruction explicitly asks to click the Submit button",\n  "confidence": 0.95\n}\n```' 
          }]
        })
      });
      
      const result = await adapter.suggestAction(mockInstruction, mockScreenState);
      
      expect(result).toEqual({
        actionType: 'click',
        target: { id: 'submit-btn' },
        reasoning: 'The instruction explicitly asks to click the Submit button',
        confidence: 0.95
      });
    });
    
    it('should handle API errors during action suggestion', async () => {
      // Mock error response
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      // Should return fallback action on error
      const result = await adapter.suggestAction(mockInstruction, mockScreenState);
      
      expect(result).toEqual({
        actionType: 'click',
        target: { text: 'Submit' },
        reasoning: 'Fallback action due to API error',
        confidence: 0.5
      });
    });
  });
  
  describe('verifyCondition()', () => {
    const mockCondition = 'The page should display "Success"';
    const mockScreenState: ScreenState = {
      title: 'Success Page',
      url: 'https://example.com/success',
      elements: [
        { type: 'heading', text: 'Success', id: 'success-heading' },
        { type: 'paragraph', text: 'Your form has been submitted successfully.', id: 'success-message' }
      ]
    };
    
    it('should verify conditions based on screen state', async () => {
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          content: [{ 
            type: 'text', 
            text: '```json\n{\n  "success": true,\n  "reason": "The page contains a heading with text Success"\n}\n```' 
          }]
        })
      });
      
      const result = await adapter.verifyCondition(mockCondition, mockScreenState);
      
      expect(result).toEqual({
        success: true,
        reason: 'The page contains a heading with text Success'
      });
    });
    
    it('should handle API errors during condition verification', async () => {
      // Mock error response
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      // Should return fallback verification on error
      const result = await adapter.verifyCondition(mockCondition, mockScreenState);
      
      expect(result).toEqual({
        success: true,
        reason: 'Fallback verification due to API error'
      });
    });
  });
  
  describe('cleanup()', () => {
    it('should clean up without errors', async () => {
      await expect(adapter.cleanup()).resolves.not.toThrow();
    });
  });
});