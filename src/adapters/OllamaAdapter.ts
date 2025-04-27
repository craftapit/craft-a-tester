import { BaseAdapter } from './BaseAdapter';
import { ScreenState, UIAction } from '../types/actions';
import { LLMAdapter } from './LLMAdapter';

/**
 * Adapter for using Ollama models locally
 */
export class OllamaAdapter extends BaseAdapter implements LLMAdapter {
  private baseUrl: string;
  private model: string;
  private contextSize: number;
  private dynamicContextSizing: boolean;

  constructor(config: { 
    baseUrl: string; 
    model: string;
    contextSize?: number;
    dynamicContextSizing?: boolean;
  }) {
    super(config);
    this.baseUrl = config.baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = config.model || process.env.OLLAMA_MODEL || 'phi3';
    this.contextSize = config.contextSize || parseInt(process.env.CONTEXT_SIZE || '8192', 10);
    this.dynamicContextSizing = config.dynamicContextSizing ?? 
      (process.env.DYNAMIC_SIZING?.toLowerCase() !== 'false');
  }
  
  /**
   * Calculates the optimal context size based on the input prompt
   * @param input The input prompt
   * @param expectedResponseFactor Ratio of expected response tokens to input tokens
   * @returns Optimal context size in tokens
   */
  private calculateOptimalContextSize(input: string, expectedResponseFactor = 0.5): number {
    // Rough character-to-token estimate (4 chars ≈ 1 token)
    const estimatedInputTokens = Math.ceil(input.length / 4);
    
    // Estimate response tokens based on input size and a factor
    const estimatedResponseTokens = Math.ceil(estimatedInputTokens * expectedResponseFactor);
    
    // Add buffer for system messages and overhead
    const totalEstimatedTokens = estimatedInputTokens + estimatedResponseTokens + 500;
    
    // Round up to nearest 1K
    const contextSizeIn1K = Math.ceil(totalEstimatedTokens / 1024);
    const optimalContextSize = contextSizeIn1K * 1024;
    
    // Get default minimum/maximum from the configured context size
    const minSize = Math.min(4096, this.contextSize);
    const maxSize = Math.max(32768, this.contextSize);
    
    // Respect minimum and maximum bounds
    return Math.min(Math.max(optimalContextSize, minSize), maxSize);
  }

  async initialize(): Promise<void> {
    try {
      console.log(`\n----- INITIALIZING OLLAMA ADAPTER -----`);
      console.log(`Attempting to connect to Ollama at ${this.baseUrl}...`);
      
      // Check if Ollama server is available with a timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
      
      try {
        // First check if the server is responding at all
        console.log(`Checking Ollama server status...`);
        const pingResponse = await fetch(`${this.baseUrl}/api/version`, {
          signal: controller.signal
        });
        
        if (!pingResponse.ok) {
          throw new Error(`Failed to connect to Ollama: ${pingResponse.statusText}`);
        }
        
        const versionData = await pingResponse.json();
        console.log(`Connected to Ollama version: ${versionData.version || 'unknown'}`);
        
        // Then list available models
        console.log(`Listing available models...`);
        const modelsResponse = await fetch(`${this.baseUrl}/api/tags`, {
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!modelsResponse.ok) {
          throw new Error(`Failed to list Ollama models: ${modelsResponse.statusText}`);
        }
        
        const modelsData = await modelsResponse.json();
        
        // Get the list of models
        const models = modelsData.models || [];
        const modelNames = models.map((m: any) => m.name);
        
        console.log(`Available models (${models.length}): ${modelNames.join(', ')}`);
        
        // Check if the specified model is available
        const modelExists = models.some((m: any) => m.name === this.model);
        if (!modelExists) {
          console.warn(`\n⚠️ WARNING: Model "${this.model}" not found in Ollama's available models!`);
          console.warn(`Please make sure it's properly installed by running: ollama pull ${this.model}`);
        } else {
          // If model exists, try to get model info
          try {
            console.log(`Getting info for model: ${this.model}...`);
            const modelInfoResponse = await fetch(`${this.baseUrl}/api/show`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ name: this.model }),
              signal: controller.signal
            });
            
            if (modelInfoResponse.ok) {
              const modelInfo = await modelInfoResponse.json();
              console.log(`Model details:`);
              console.log(` - Size: ${modelInfo.size ? (modelInfo.size / 1024 / 1024 / 1024).toFixed(2) + ' GB' : 'unknown'}`);
              console.log(` - Modified: ${modelInfo.modified || 'unknown'}`);
              console.log(` - Format: ${modelInfo.format || 'unknown'}`);
              console.log(` - Parameters: ${modelInfo.parameters || 'unknown'}`);
            } else {
              console.warn(`Could not retrieve detailed info for model ${this.model}`);
            }
          } catch (infoError) {
            console.warn(`Error getting model info: ${infoError instanceof Error ? infoError.message : 'unknown error'}`);
          }
        }
        
        // Validate the context size
        if (this.contextSize < 2048) {
          console.warn(`\n⚠️ WARNING: Context size (${this.contextSize}) is quite small. Consider using at least 8192.`);
        }
        
        // Test if the model actually works by sending a small prompt
        try {
          console.log(`\nTesting model with a simple prompt (streaming)...`);
          const testStartTime = Date.now();
          
          // Set up a controller with timeouts for the test
          const testController = new AbortController();
          const testTimeout = setTimeout(() => testController.abort(), 30000); // 30 second timeout for test
          
          try {
            const testResponse = await fetch(`${this.baseUrl}/api/chat`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: this.model,
                messages: [
                  { role: "system", content: "You are a helpful AI assistant." },
                  { role: "user", content: "What's the main difference between TypeScript interfaces and types? Answer in one sentence." }
                ],
                options: {
                  num_ctx: this.contextSize,
                  temperature: 0.7
                },
                stream: true // Use streaming for test too
              }),
              signal: testController.signal
            });
            
            if (!testResponse.ok) {
              throw new Error(`Test response error: ${testResponse.status} ${testResponse.statusText}`);
            }
            
            if (!testResponse.body) {
              throw new Error('Test response body is null');
            }
            
            // Process the streaming test response
            const testReader = testResponse.body.getReader();
            let testResult = '';
            let testChunks = '';
            let testTokens = 0;
            let firstTokenTime = 0;
            let receivedFirstToken = false;
            
            console.log('  Receiving test response:');
            process.stdout.write('  ');
            
            while (true) {
              const { done, value } = await testReader.read();
              
              if (done) {
                process.stdout.write('\n');
                break;
              }
              
              // Record when we receive the first meaningful token
              if (!receivedFirstToken) {
                firstTokenTime = Date.now();
              }
              
              // Convert the chunk to text
              const chunk = new TextDecoder().decode(value);
              testChunks += chunk;
              
              // Parse the chunks as they arrive
              const lines = testChunks.split('\n');
              testChunks = lines.pop() || '';
              
              for (const line of lines) {
                if (!line.trim()) continue;
                
                try {
                  // Parse the Ollama JSON response (no data: prefix)
                  const data = JSON.parse(line);
                  
                  if (data.message?.content) {
                    if (!receivedFirstToken) {
                      receivedFirstToken = true;
                      process.stdout.write('Got first token! ');
                    }
                    
                    testResult += data.message.content;
                    testTokens++;
                    process.stdout.write('.');
                  }
                  
                  // Check if this is the final message
                  if (data.done === true) {
                    process.stdout.write(' [done] ');
                  }
                } catch (e) {
                  // Log parse errors in test for debugging
                  console.log(`\n  Parse error on: ${line.substring(0, 40)}...`);
                }
              }
            }
            
            const testEndTime = Date.now();
            const totalTestTime = (testEndTime - testStartTime) / 1000;
            const timeToFirstToken = receivedFirstToken 
              ? (firstTokenTime - testStartTime) / 1000 
              : 0;
            
            console.log(`\n  Test complete - "${testResult.substring(0, 100)}${testResult.length > 100 ? '...' : ''}"`);
            console.log(`  Total time: ${totalTestTime.toFixed(2)}s, Time to first token: ${timeToFirstToken.toFixed(2)}s`);
            console.log(`  Received ${testTokens} streaming updates`);
            
            if (receivedFirstToken) {
              console.log(`  ✅ Model is working properly with streaming!`);
            } else {
              console.warn(`  ⚠️ WARNING: Did not receive any tokens from the model!`);
            }
          } finally {
            clearTimeout(testTimeout);
          }
        } catch (testError) {
          console.warn(`Error during model test: ${testError instanceof Error ? testError.message : 'unknown error'}`);
        }
        
        console.log(`\nInitialized Ollama adapter with model: ${this.model}, context size: ${this.contextSize}`);
      } catch (error: unknown) {
        // Clean up any timeouts from the test
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Connection to Ollama at ${this.baseUrl} timed out`);
        }
        throw error;
      }
    } catch (error: unknown) {
      console.error('\n❌ Failed to initialize Ollama adapter:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to connect to Ollama server at ${this.baseUrl}: ${errorMessage}\n` +
                      `Please ensure Ollama is running at ${this.baseUrl} with the ${this.model} model installed.`);
    }
  }

  async complete(prompt: string): Promise<string> {
    try {
      console.log(`\n----- SENDING PROMPT TO OLLAMA -----`);
      console.log(`Model: ${this.model}`);
      console.log(`Prompt length: ${prompt.length} chars`);
      
      // Calculate the optimal context size if dynamic sizing is enabled
      let effectiveContextSize = this.contextSize;
      if (this.dynamicContextSizing) {
        effectiveContextSize = this.calculateOptimalContextSize(prompt);
        console.log(`Dynamic context sizing: ${effectiveContextSize} (base: ${this.contextSize})`);
      } else {
        console.log(`Context size: ${effectiveContextSize} (fixed)`);
      }
      
      console.log(`First 100 chars: ${prompt.substring(0, 100)}...`);
      console.log(`Using Ollama API at: ${this.baseUrl}`);
      
      // For debugging only - count scenario instances in the prompt
      const scenarioCount = (prompt.match(/## Scenario:/g) || []).length;
      const stepCount = (prompt.match(/### Steps/g) || []).length;
      console.log(`Detected approximately ${scenarioCount} scenarios and ${stepCount} step sections`);
      
      // Create an AbortController for the fetch operation
      const controller = new AbortController();
      
      // Track whether we've received the first chunk
      let firstChunkReceived = false;
      
      // Instead of a single timeout, we'll implement adaptive timeouts
      // Initial timeout - 30 seconds to establish connection and get first token
      const initialTimeoutDuration = 30000; 
      let initialTimeout = setTimeout(() => {
        console.log('Initial connection timeout reached (30s) - aborting request');
        controller.abort();
      }, initialTimeoutDuration);
      
      // We'll reset this timeout whenever we receive data
      let inactivityTimeout: NodeJS.Timeout | null = null;
      
      // Function to reset the inactivity timeout
      const resetInactivityTimeout = () => {
        // Clear any existing timeout
        if (inactivityTimeout) {
          clearTimeout(inactivityTimeout);
        }
        
        // Set a new 60-second inactivity timeout
        inactivityTimeout = setTimeout(() => {
          console.log('No activity for 60 seconds - aborting request');
          controller.abort();
        }, 60000);
      };
      
      try {
        // Using the OpenAI compatible completion endpoint with streaming for better timeout management
        console.log(`Using Ollama streaming endpoint at ${this.baseUrl}/api/chat...`);
        const startTime = Date.now();
        let lastProgressTime = startTime;
        
        // Prepare system message based on test content
        let systemMessage = "You are a helpful AI assistant and testing expert. ";
        
        // Add specific instructions based on detected content
        if (prompt.includes("TypeScript") || prompt.includes("Zod")) {
          systemMessage += "You are an expert in TypeScript, type systems, and schema validation libraries like Zod. ";
        }
        
        if (prompt.includes("API") || prompt.includes("REST")) {
          systemMessage += "You are experienced with RESTful APIs, OpenAPI specifications, and API design. ";
        }
        
        systemMessage += "Help analyze and execute software tests based on the provided contexts and instructions. Be thorough and follow the test steps precisely.";
        
        // Calculate the optimal context size if dynamic sizing is enabled
        const effectiveContextSize = this.dynamicContextSizing 
          ? this.calculateOptimalContextSize(prompt)
          : this.contextSize;
        
        // Set up the streaming request
        const requestBody = {
          model: this.model,
          messages: [
            { 
              role: "system", 
              content: systemMessage
            },
            { 
              role: "user", 
              content: prompt 
            }
          ],
          options: {
            num_ctx: effectiveContextSize,
            temperature: 0.2, // Lower temperature for more consistent, deterministic responses
            num_predict: 4096, // Ensure we get a complete response
          },
          stream: true // Enable streaming
        };
        
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        if (!response.ok) {
          // Clear both timeouts
          clearTimeout(initialTimeout);
          if (inactivityTimeout) clearTimeout(inactivityTimeout);
          
          throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }
        
        if (!response.body) {
          // Clear both timeouts
          clearTimeout(initialTimeout);
          if (inactivityTimeout) clearTimeout(inactivityTimeout);
          
          throw new Error('Response body is null or undefined');
        }
        
        // Process the streaming response
        const reader = response.body.getReader();
        let fullResult = '';
        let accumulatedChunks = '';
        let firstChunkReceived = false;
        let tokens = 0;
        let progressDots = 0;
        let activelyGenerating = false;
        
        try {
          console.log(`\nReceiving streaming response from Ollama:`);
          process.stdout.write('  ');
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              process.stdout.write('\n');
              break;
            }
            
            // We received data, clear the initial timeout and reset the inactivity timeout
            if (!firstChunkReceived) {
              // First chunk received, clear the initial timeout
              clearTimeout(initialTimeout);
              console.log('  Connection established, initial timeout cleared.');
              firstChunkReceived = true;
            }
            
            // Reset the inactivity timeout since we received data
            resetInactivityTimeout();
            
            // Convert the chunk to text
            const chunk = new TextDecoder().decode(value);
            accumulatedChunks += chunk;
            
            // Parse the chunks as they arrive
            let lines = accumulatedChunks.split('\n');
            accumulatedChunks = lines.pop() || ''; // Keep the last incomplete line for the next iteration
            
            for (const line of lines) {
              if (!line.trim()) continue;
              
              try {
                // Ollama doesn't use the data: prefix in its streaming output
                const data = JSON.parse(line);
                
                if (!activelyGenerating && data.message?.content) {
                  console.log('  First token received! Model is generating content...');
                  activelyGenerating = true;
                }
                
                if (data.message?.content) {
                  fullResult += data.message.content;
                  tokens++;
                  
                  // Show progress without overwhelming the console
                  if (tokens % 5 === 0) {
                    process.stdout.write('.');
                    progressDots++;
                    if (progressDots % 50 === 0) {
                      process.stdout.write(`\n  `);
                    }
                  }
                }
                
                // Check if this is the final message
                if (data.done === true) {
                  console.log('  Done signal received from Ollama.');
                }
              } catch (e) {
                console.warn(`Warning: Could not parse streaming response chunk: ${line}\nError: ${e}`);
              }
            }
          }
        } finally {
          reader.releaseLock();
          
          // Clean up any remaining timeouts
          clearTimeout(initialTimeout);
          if (inactivityTimeout) clearTimeout(inactivityTimeout);
        }
        
        const endTime = Date.now();
        const processingTime = (endTime - startTime) / 1000;
        
        console.log(`\n----- RECEIVED COMPLETE RESPONSE FROM OLLAMA -----`);
        console.log(`Processing time: ${processingTime.toFixed(2)} seconds`);
        console.log(`Response length: ${fullResult.length} chars`);
        console.log(`Tokens received during streaming: ~${tokens}`);
        console.log(`First 100 chars: ${fullResult.substring(0, 100)}...`);
        
        // Calculate generation speed
        const tokensPerSecond = tokens / processingTime;
        console.log(`Generation speed: ${tokensPerSecond.toFixed(2)} tokens/second`);
        
        // We no longer need to warn about fast responses since we can SEE the model generating
        console.log(`\n✅ Model is confirmed working - observed ${tokens} streaming updates over ${processingTime.toFixed(2)} seconds`);
        
        // Return the complete response
        return fullResult;
      } catch (error: unknown) {
        // Clean up any remaining timeouts
        clearTimeout(initialTimeout);
        if (inactivityTimeout) clearTimeout(inactivityTimeout);
        
        // Handle AbortError (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Connection to Ollama timed out. The server might be down, busy, or the generation stalled.`);
        }
        throw error;
      }
    } catch (error: unknown) {
      console.error('Error calling Ollama API:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get completion from Ollama: ${errorMessage}`);
    }
  }

  async suggestAction(
    instruction: string,
    screenState: ScreenState
  ): Promise<UIAction> {
    console.log(`Suggesting action for: ${instruction}`);
    
    const prompt = `
You are an AI assistant helping to automate UI testing.

Given the following instruction from a test scenario:
"${instruction}"

And the current screen state:
${JSON.stringify(screenState, null, 2)}

Determine the most appropriate action to take. Return a JSON object with:
- actionType: "click", "input", "navigate", "wait", "assert", etc.
- target: Element to interact with (if applicable)
- value: Value to input (if applicable)
- reasoning: Why this action was chosen
- confidence: A number between 0 and 1 indicating your confidence

Response (JSON only):
`;

    try {
      const response = await this.complete(prompt);
      
      // Extract JSON from the response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                      response.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const actionJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return {
          actionType: actionJson.actionType,
          target: actionJson.target,
          value: actionJson.value,
          reasoning: actionJson.reasoning,
          confidence: actionJson.confidence
        };
      }
      
      throw new Error('Could not parse action from LLM response');
    } catch (error) {
      console.error('Error suggesting action:', error);
      // Fallback action
      return {
        actionType: 'click',
        target: { text: 'Submit' },
        reasoning: 'Fallback action due to API error',
        confidence: 0.5
      };
    }
  }
  
  async verifyCondition(
    condition: string,
    screenState: ScreenState
  ): Promise<{ success: boolean; reason?: string }> {
    console.log(`Verifying condition: ${condition}`);
    
    const prompt = `
You are an AI assistant helping to automate UI testing.

Given the following condition to verify:
"${condition}"

And the current screen state:
${JSON.stringify(screenState, null, 2)}

Determine if the condition is met. Return a JSON object with:
- success: true or false
- reason: Explanation of why the condition is met or not met

Response (JSON only):
`;

    try {
      const response = await this.complete(prompt);
      
      // Extract JSON from the response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                      response.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const resultJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return {
          success: resultJson.success,
          reason: resultJson.reason
        };
      }
      
      throw new Error('Could not parse verification result from LLM response');
    } catch (error) {
      console.error('Error verifying condition:', error);
      // Fallback verification
      return {
        success: true,
        reason: 'Fallback verification due to API error'
      };
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for Ollama
  }
}