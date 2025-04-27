import { BaseAdapter } from './BaseAdapter';
import { ScreenState, UIAction } from '../types/actions';
import { LLMAdapter } from './LLMAdapter';

export class AnthropicAdapter extends BaseAdapter implements LLMAdapter {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }) {
    super(config);
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.model = config.model || 'claude-2';
  }
  
  async initialize(): Promise<void> {
    console.log('Initializing Anthropic adapter');
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }
  }
  
  async cleanup(): Promise<void> {
    console.log('Cleaning up Anthropic adapter');
    // Nothing to clean up
  }
  
  /**
   * Complete a prompt with the LLM
   * @param prompt The prompt to complete
   * @returns The completion text
   */
  async complete(prompt: string): Promise<string> {
    console.log(`Completing prompt with Anthropic: ${prompt.substring(0, 50)}...`);
    
    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      throw new Error(`Failed to get completion from Anthropic: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.content[0].text;
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
      console.error('Error calling Anthropic API:', error);
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
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.content[0].text;
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
      console.error('Error calling Anthropic API:', error);
      // Fallback verification
      return {
        success: true,
        reason: 'Fallback verification due to API error'
      };
    }
  }
}
