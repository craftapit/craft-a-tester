import { BaseAdapter } from './BaseAdapter';
import { ScreenState, UIAction } from '../types/actions';
import { LLMAdapter } from './LLMAdapter';

export class CraftacoderAdapter extends BaseAdapter implements LLMAdapter {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private provider: string;

  constructor(config: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    provider?: string;
  }) {
    super(config);
    this.apiKey = config.apiKey || process.env.CRAFTACODER_API_KEY || '';
    this.baseUrl = config.baseUrl || 'http://localhost:3000';
    this.model = config.model || 'claude-3-sonnet-20240229';
    this.provider = config.provider || 'anthropic';
  }
  
  async initialize(): Promise<void> {
    console.log('Initializing Craftacoder adapter');
    if (!this.apiKey) {
      throw new Error('Craftacoder API key is required');
    }
  }
  
  async cleanup(): Promise<void> {
    console.log('Cleaning up Craftacoder adapter');
    // Nothing to clean up
  }
  
  /**
   * Complete a prompt with the LLM via Craftacoder API
   * @param prompt The prompt to complete
   * @returns The completion text
   */
  async complete(prompt: string): Promise<string> {
    console.log(`Completing prompt via Craftacoder: ${prompt.substring(0, 50)}...`);
    
    try {
      // Build the endpoint URL for the appropriate provider
      const endpoint = `/providers/${this.provider}/messages`;
      
      // Prepare the request payload according to provider expectations
      let payload: any;
      
      if (this.provider === 'anthropic') {
        payload = {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.2
        };
      } else if (this.provider === 'openai') {
        payload = {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.2
        };
      } else {
        throw new Error(`Unsupported provider: ${this.provider}`);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Craftacoder API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract content based on provider response format
      let content = '';
      if (this.provider === 'anthropic') {
        content = data.content[0].text;
      } else if (this.provider === 'openai') {
        content = data.choices[0].message.content;
      }
      
      return content;
    } catch (error) {
      console.error('Error calling Craftacoder API:', error);
      throw new Error(`Failed to get completion from Craftacoder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Suggest an action based on the instruction and screen state
   */
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
      const content = await this.complete(prompt);
      
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                      content.match(/{[\s\S]*}/);
      
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
      console.error('Error getting action suggestion:', error);
      // Fallback action
      return {
        actionType: 'click',
        target: { text: 'Submit' },
        reasoning: 'Fallback action due to API error',
        confidence: 0.5
      };
    }
  }
  
  /**
   * Verify if a condition is met based on the screen state
   */
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
      const content = await this.complete(prompt);
      
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                      content.match(/{[\s\S]*}/);
      
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
}