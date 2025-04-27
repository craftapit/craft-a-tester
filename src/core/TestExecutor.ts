import { Scenario, ScenarioContext, TestType } from '../types/scenario';
import { TestResult, TestResults } from '../types/results';
import { ScenarioParser } from './ScenarioParser';
import { BaseAdapter } from '../adapters/BaseAdapter';
import { APIAdapter } from '../adapters/APIAdapter';
import { DatabaseAdapter } from '../adapters/DatabaseAdapter';
import { Logger } from '../utils/logger';
import { Addon, CapabilityFeedback } from '../types/addon';
import { CapabilityRegistry } from './CapabilityRegistry';
import { LLMAdapter } from '../adapters/LLMAdapter';

export interface TestExecutorConfig {
  browser?: {
    headless?: boolean;
    slowMo?: number;
    [key: string]: any;
  };
  logging?: {
    level?: string;
    screenshots?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

export class TestExecutor {
  private config: TestExecutorConfig;
  private scenarioParser: ScenarioParser;
  private adapters: Map<string, BaseAdapter> = new Map();
  private logger: Logger;
  private capabilityRegistry: CapabilityRegistry = new CapabilityRegistry();
  private addons: Map<string, Addon> = new Map();
  
  constructor(
    config: TestExecutorConfig = {},
    registry?: CapabilityRegistry
  ) {
    this.config = {
      browser: {
        headless: true,
        ...config.browser
      },
      logging: {
        level: 'info',
        screenshots: true,
        ...config.logging
      }
    };
    
    this.scenarioParser = new ScenarioParser();
    this.logger = new Logger('TestExecutor');
    
    if (registry) {
      this.capabilityRegistry = registry;
    }
  }
  
  /**
   * Register an adapter with the test executor
   */
  registerAdapter(name: string, adapter: BaseAdapter): void {
    this.adapters.set(name, adapter);
    this.capabilityRegistry.registerAdapter(name, adapter);
    
    // If this is an LLM adapter, set it as the resolver for capabilities
    if (adapter instanceof LLMAdapter) {
      this.capabilityRegistry.setLLMAdapter(adapter);
    }
  }
  
  /**
   * Register an addon with the test executor
   */
  registerAddon(addon: Addon): void {
    if (this.addons.has(addon.name)) {
      this.logger.warn(`Addon ${addon.name} is already registered. Overwriting.`);
    }
    
    this.addons.set(addon.name, addon);
    addon.register(this.capabilityRegistry);
    
    this.logger.info(`Registered addon: ${addon.name} v${addon.version}`);
  }
  
  /**
   * Get a list of all registered addons
   */
  getAddons(): Addon[] {
    return Array.from(this.addons.values());
  }
  
  /**
   * Provide feedback on a capability resolution
   */
  async provideFeedback(feedback: CapabilityFeedback): Promise<void> {
    await this.capabilityRegistry.provideFeedback(feedback);
  }
  
  async runScenario(scenarioPath: string): Promise<TestResult> {
    this.logger.info(`Running scenario: ${scenarioPath}`);
    
    // Parse the scenario
    const scenario = await this.scenarioParser.parseScenario(scenarioPath);
    
    // Initialize adapters
    await this.initializeAdapters();
    
    // Execute the scenario
    const result = await this.executeScenario(scenario);
    
    // Cleanup
    await this.cleanupAdapters();
    
    return result;
  }
  
  async runScenarios(scenarioPaths: string[]): Promise<TestResults> {
    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    
    const startTime = Date.now();
    
    for (const path of scenarioPaths) {
      const result = await this.runScenario(path);
      results.push(result);
      
      if (result.success) {
        passed++;
      } else {
        failed++;
      }
    }
    
    const duration = Date.now() - startTime;
    
    return {
      total: scenarioPaths.length,
      passed,
      failed,
      results,
      duration
    };
  }
  
  private async initializeAdapters(): Promise<void> {
    // Initialize all registered adapters
    for (const adapter of this.adapters.values()) {
      await adapter.initialize();
    }
  }
  
  private async cleanupAdapters(): Promise<void> {
    // Cleanup all registered adapters
    for (const adapter of this.adapters.values()) {
      await adapter.cleanup();
    }
  }
  
  private getPrimaryAdapterForTestType(testType: TestType): BaseAdapter | null {
    switch (testType) {
      case 'ui':
        return this.adapters.get('browser') || null;
      case 'api':
        return this.adapters.get('api') || null;
      case 'database':
        return this.adapters.get('database') || null;
      default:
        return this.adapters.get('generic') || this.adapters.get('llm') || null;
    }
  }
  
  /**
   * Execute a scenario
   * @param scenario The scenario to execute
   * @returns The test result
   */
  async executeScenario(scenario: Scenario): Promise<TestResult> {
    const stepResults = [];
    let success = true;
    
    const startTime = new Date();
    
    // Get the LLM adapter for interpreting steps
    const llmAdapter = this.adapters.get('llm');
    if (!llmAdapter) {
      throw new Error('LLM adapter is required but not registered');
    }
    
    // Get the primary adapter based on test type
    const testType = scenario.testType || 'generic';
    const primaryAdapter = this.getPrimaryAdapterForTestType(testType);
    
    if (!primaryAdapter) {
      throw new Error(`No adapter registered for test type: ${testType}`);
    }
    
    // Initialize state based on test type
    let currentState: any = {};
    
    if (testType === 'ui' && 'captureScreenState' in primaryAdapter) {
      try {
        currentState = await (primaryAdapter as any).captureScreenState();
      } catch (error) {
        console.warn('Failed to capture initial state:', error);
      }
    }
    
    for (const step of scenario.steps) {
      const stepStartTime = Date.now();
      const stepId = `${scenario.filePath}:${step.lineNumber || 0}`;
      
      try {
        console.log(`Executing step: ${step.type} ${step.instruction}`);
        
        // Try to resolve the step using registered capabilities first
        if (llmAdapter instanceof LLMAdapter) {
          try {
            const resolution = await this.capabilityRegistry.findCapabilityForAction(
              `${step.type} ${step.instruction}`
            );
            
            if (resolution && resolution.confidence > 0.7) {
              this.logger.info(`Using capability: ${resolution.capability.name} (confidence: ${resolution.confidence.toFixed(2)})`);
              
              // Execute the capability with the resolved parameters
              const result = await resolution.capability.handler(...resolution.parameters);
              
              // Store the successful resolution for feedback
              await this.capabilityRegistry.provideFeedback({
                stepId,
                quality: "correct",
                executionResult: "success",
                cacheStrategy: "preserve",
                message: "Capability resolved and executed successfully",
                source: "system",
                timestamp: Date.now(),
                description: step.instruction,
                capabilityName: resolution.capability.name,
                parameters: resolution.parameters
              });
              
              // Update the current state with the result if appropriate
              if (result !== undefined) {
                currentState = result;
              }
              
              // Add the step result
              stepResults.push({
                step: `${step.type} ${step.instruction}`,
                success: true,
                duration: Date.now() - stepStartTime
              });
              
              // Skip the rest of the step processing since we handled it with a capability
              continue;
            }
          } catch (error) {
            // If capability resolution fails, fall back to the standard approach
            this.logger.warn(`Capability resolution failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        
        // Standard step execution if no capability matched
        // Use the LLM to help with test execution
        if (step.type === 'when') {
          // Handle action steps based on test type
          if (testType === 'ui' && 'executeAction' in primaryAdapter) {
            // UI actions (simplified from original TestRunner)
            const action = await this.parseUIAction(step.instruction, currentState, llmAdapter);
            
            const result = await (primaryAdapter as any).executeAction(action);
            if (!result.success) {
              throw new Error(`Failed to execute action: ${action.actionType}`);
            }
            
            // Update the state after the action
            if ('captureScreenState' in primaryAdapter) {
              currentState = await (primaryAdapter as any).captureScreenState();
            }
          } 
          else if (testType === 'api' && primaryAdapter instanceof APIAdapter) {
            // For API tests, parse the instruction to determine the API request
            const apiRequest = await this.parseAPIRequest(step.instruction, scenario.context, llmAdapter);
            currentState = await primaryAdapter.makeRequest(apiRequest);
          }
          else if (testType === 'database' && primaryAdapter instanceof DatabaseAdapter) {
            // For database tests, parse the instruction to determine the query
            const query = await this.parseDatabaseQuery(step.instruction, scenario.context, llmAdapter);
            currentState = await primaryAdapter.executeQuery(query.sql, query.params);
          }
          else if (testType === 'typedapi') {
            // For TypedAPI tests, see if we have the appropriate adapter
            const typedAPIAdapter = this.adapters.get('typedapi');
            if (!typedAPIAdapter) {
              throw new Error('TypedAPI adapter is required for TypedAPI tests but not registered');
            }
            
            // We'll use the LLM to determine what to do here
            // This is just a placeholder until we integrate with the actual capabilities
            throw new Error('TypedAPI test execution not fully implemented yet');
          }
        }
        
        // Use the LLM to verify conditions for "then" steps
        if ((step.type === 'then' || step.type === 'and')) {
          let verification;
          
          if (testType === 'ui' && 'verifyCondition' in llmAdapter) {
            verification = await (llmAdapter as any).verifyCondition(
              step.instruction,
              currentState
            );
          }
          else if (testType === 'api' && primaryAdapter instanceof APIAdapter) {
            // For API tests, verify the response
            const expectations = await this.parseAPIExpectations(step.instruction, llmAdapter);
            verification = await primaryAdapter.verifyResponse(expectations);
          }
          else if (testType === 'database' && primaryAdapter instanceof DatabaseAdapter) {
            // For database tests, verify the query result
            const expectations = await this.parseDatabaseExpectations(step.instruction, llmAdapter);
            verification = await primaryAdapter.verifyQueryResult(expectations);
          }
          else if (testType === 'typedapi') {
            // For TypedAPI tests, see if we have the appropriate adapter
            const typedAPIAdapter = this.adapters.get('typedapi');
            if (!typedAPIAdapter) {
              throw new Error('TypedAPI adapter is required for TypedAPI tests but not registered');
            }
            
            // We'll use the LLM to determine what to do here
            // This is just a placeholder until we integrate with the actual capabilities
            throw new Error('TypedAPI test verification not fully implemented yet');
          }
          
          if (!verification || !verification.success) {
            throw new Error(`Condition not met: ${step.instruction}. Reason: ${verification?.reason || 'Unknown'}`);
          }
        }
        
        // Capture a screenshot for UI tests if available and configured
        let screenshot: Buffer | undefined;
        if (testType === 'ui' && 
            this.config.logging?.screenshots && 
            primaryAdapter && 
            'captureScreenshot' in primaryAdapter) {
          try {
            screenshot = await (primaryAdapter as any).captureScreenshot();
          } catch (error) {
            console.warn('Failed to capture screenshot:', error);
          }
        }
        
        stepResults.push({
          step: `${step.type} ${step.instruction}`,
          success: true,
          screenshot: screenshot ? screenshot.toString('base64') : undefined,
          duration: Date.now() - stepStartTime
        });
      } catch (error: unknown) {
        success = false;
        stepResults.push({
          step: `${step.type} ${step.instruction}`,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - stepStartTime
        });
        break;
      }
    }
    
    const endTime = new Date();
    
    const result: TestResult = {
      scenarioTitle: scenario.title,
      success,
      stepResults,
      duration: endTime.getTime() - startTime.getTime(),
      startTime,
      endTime,
      
      // Add properties required by new TestResult interface
      passed: success,
      steps: stepResults.map(step => ({
        description: step.step,
        status: step.success ? 'passed' as const : 'failed' as const,
        error: step.error
      }))
    };
    
    return result;
  }

  // Helper methods for parsing test steps with LLM assistance
  
  private async parseUIAction(
    instruction: string, 
    currentState: any, 
    llmAdapter: any
  ): Promise<any> {
    // Simplified method to parse UI actions
    if ('suggestAction' in llmAdapter) {
      return await llmAdapter.suggestAction(instruction, currentState);
    }
    
    // Fallback if LLM adapter doesn't have the method
    return { 
      actionType: 'click',
      selector: 'button',
      confidence: 0.5
    };
  }
  
  private async parseAPIRequest(
    instruction: string, 
    context: ScenarioContext,
    llmAdapter?: any
  ): Promise<any> {
    // This would use the LLM to parse the instruction into an API request
    // For now, we'll use a simple implementation
    const methodMatch = instruction.match(/send a (GET|POST|PUT|DELETE|PATCH) request/i);
    const urlMatch = instruction.match(/to ["'](.+?)["']/);
    
    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
    const url = urlMatch ? urlMatch[1] : '/';
    
    // Look for a body in the instruction details
    const bodyMatch = instruction.match(/with body:?\s*({.+})/s);
    let body;
    
    if (bodyMatch) {
      try {
        body = JSON.parse(bodyMatch[1]);
      } catch (e) {
        console.warn('Could not parse body from instruction:', e);
      }
    }
    
    return { method, url, body };
  }

  private async parseAPIExpectations(
    instruction: string,
    llmAdapter?: any
  ): Promise<any> {
    // This would use the LLM to parse the instruction into API response expectations
    // For now, we'll use a simple implementation
    const statusMatch = instruction.match(/status (?:code )?(?:should be |is |equals |= )(\d+)/i);
    const status = statusMatch ? parseInt(statusMatch[1]) : undefined;
    
    // Look for expected body content
    const bodyMatch = instruction.match(/body (?:should contain|contains|has):?\s*({.+})/s);
    let bodyContains;
    
    if (bodyMatch) {
      try {
        bodyContains = JSON.parse(bodyMatch[1]);
      } catch (e) {
        console.warn('Could not parse expected body from instruction:', e);
      }
    }
    
    return { status, bodyContains };
  }

  private async parseDatabaseQuery(
    instruction: string, 
    context: ScenarioContext,
    llmAdapter?: any
  ): Promise<{ sql: string; params: any[] }> {
    // This would use the LLM to parse the instruction into a database query
    // For now, we'll use a simple implementation
    let sql = '';
    const params: any[] = [];
    
    if (instruction.includes('select') || instruction.includes('query')) {
      sql = 'SELECT * FROM users LIMIT 10';
    } else if (instruction.includes('insert')) {
      sql = 'INSERT INTO users (name, email) VALUES (?, ?)';
      params.push('Test User', 'test@example.com');
    } else if (instruction.includes('update')) {
      sql = 'UPDATE users SET name = ? WHERE id = ?';
      params.push('Updated Name', 1);
    } else if (instruction.includes('delete')) {
      sql = 'DELETE FROM users WHERE id = ?';
      params.push(1);
    }
    
    return { sql, params };
  }

  private async parseDatabaseExpectations(
    instruction: string,
    llmAdapter?: any
  ): Promise<any> {
    // This would use the LLM to parse the instruction into database result expectations
    // For now, we'll use a simple implementation
    const rowCountMatch = instruction.match(/(\d+) rows?/i);
    const rowCount = rowCountMatch ? parseInt(rowCountMatch[1]) : undefined;
    
    const hasRows = instruction.includes('should have rows') || 
                    instruction.includes('should contain rows') ||
                    instruction.includes('should not be empty');
    
    return { rowCount, hasRows };
  }
}