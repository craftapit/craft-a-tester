import { BaseAdapter } from '../adapters/BaseAdapter';
import { TestExecutor } from '../core/TestExecutor';

/**
 * Parameter for a capability
 */
export interface CapabilityParameter {
  /**
   * Name of the parameter
   */
  name: string;
  
  /**
   * Description of the parameter
   */
  description: string;
  
  /**
   * Whether the parameter is required
   */
  required: boolean;
  
  /**
   * Type of the parameter
   */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  
  /**
   * Example value for the parameter
   */
  example?: any;
}

/**
 * A capability provided by an addon
 */
export interface AddonCapability {
  /**
   * Name of the capability
   */
  name: string;
  
  /**
   * Natural language descriptions of the capability
   */
  descriptions: string[];
  
  /**
   * Examples of how to use in tests
   */
  examples: string[];
  
  /**
   * The actual implementation function
   */
  handler: (...args: any[]) => Promise<any>;
  
  /**
   * Optional parameter descriptions for the LLM
   */
  parameters?: CapabilityParameter[];
}

/**
 * Constructor type for adapters
 */
export type AdapterConstructor = new (config?: any) => BaseAdapter;

/**
 * Selection quality for capabilities
 * Using string literal type for simpler runtime behavior
 */
export type ResolutionQuality = "correct" | "incorrect";

/**
 * Execution result for capabilities
 */
export type ExecutionResult = "success" | "failure";

/**
 * Cache management strategy
 */
export type CacheStrategy = "preserve" | "cleanup";

/**
 * Feedback interface for capability resolutions
 */
export interface CapabilityFeedback {
  /**
   * ID of the test step
   */
  stepId: string;
  
  /**
   * Quality rating for capability selection
   */
  quality: ResolutionQuality;
  
  /**
   * Result of executing the capability
   */
  executionResult?: ExecutionResult;
  
  /**
   * Strategy for cache management
   */
  cacheStrategy?: CacheStrategy;
  
  /**
   * Optional feedback message
   */
  message?: string;
  
  /**
   * If the resolution was incorrect, what should have been selected
   */
  correction?: {
    capability: string;
    parameters: any[];
  };
  
  /**
   * Source of the feedback
   */
  source: "user" | "system" | "code";
  
  /**
   * Timestamp when the feedback was created
   */
  timestamp: number;
  
  /**
   * Description of the action
   */
  description?: string;
  
  /**
   * Name of the capability resolved
   */
  capabilityName?: string;
  
  /**
   * Parameters passed to the capability
   */
  parameters?: any[];
}

/**
 * Interface for the capability registry
 */
export interface CapabilityRegistry {
  /**
   * Register an adapter
   */
  registerAdapter(type: string, adapter: BaseAdapter): void;
  
  /**
   * Register a capability
   */
  registerCapability(capability: AddonCapability): void;
  
  /**
   * Get all capabilities as a natural language description for LLM context
   */
  getCapabilityContext(): string;
  
  /**
   * Find the most appropriate capability for an action description
   */
  findCapabilityForAction(description: string): Promise<{
    capability: AddonCapability;
    parameters: any[];
    confidence: number;
  } | null>;
  
  /**
   * Provide feedback on a capability resolution
   */
  provideFeedback(feedback: CapabilityFeedback): Promise<void>;
}

/**
 * Interface for addons to implement
 */
export interface Addon {
  /**
   * Addon name
   */
  name: string;
  
  /**
   * Addon version
   */
  version: string;
  
  /**
   * Addon description
   */
  description: string;
  
  /**
   * Register with the system
   */
  register(registry: CapabilityRegistry): void;
}