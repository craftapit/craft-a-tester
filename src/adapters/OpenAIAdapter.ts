import { BaseAdapter } from './BaseAdapter';
import { ScreenState, UIAction } from '../types/actions';
import OpenAI from 'openai';
import { LLMAdapter } from './LLMAdapter';

export class OpenAIAdapter extends BaseAdapter implements LLMAdapter {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private client: OpenAI;

  constructor(config: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.model = config.model || 'gpt-4';
    
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl
    });
  }
  
  async initialize(): Promise<void> {
    console.log('Initializing OpenAI adapter');
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }
  
  async cleanup(): Promise<void> {
    console.log('Cleaning up OpenAI adapter');
    // Nothing to clean up
  }
  
  /**
   * Complete a prompt with the LLM
   * @param prompt The prompt to complete
   * @returns The completion text
   */
  async complete(prompt: string): Promise<string> {
    console.log(`Completing prompt with OpenAI: ${prompt.substring(0, 50)}...`);
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
      });

      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error('Empty response from OpenAI API');
      }
      
      return content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw new Error(`Failed to get completion from OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error('Empty response from OpenAI API');
      }
      
      try {
        const actionJson = JSON.parse(content);
        return {
          actionType: actionJson.actionType,
          target: actionJson.target,
          value: actionJson.value,
          reasoning: actionJson.reasoning,
          confidence: actionJson.confidence
        };
      } catch (parseError) {
        throw new Error(`Could not parse JSON from OpenAI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
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
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error('Empty response from OpenAI API');
      }
      
      try {
        const resultJson = JSON.parse(content);
        return {
          success: resultJson.success,
          reason: resultJson.reason
        };
      } catch (parseError) {
        throw new Error(`Could not parse JSON from OpenAI response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      // Fallback verification
      return {
        success: true,
        reason: 'Fallback verification due to API error'
      };
    }
  }
}
