import { AddonCapability, CapabilityFeedback, CapabilityRegistry as ICapabilityRegistry } from '../types/addon';
import { BaseAdapter } from '../adapters/BaseAdapter';
import { LLMAdapter } from '../adapters/LLMAdapter';
import { VectorStore } from '../utils/VectorStore';
import { SimpleEmbedding } from '../utils/SimpleEmbedding';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Registry for addon capabilities with vector-based caching
 */
export class CapabilityRegistry implements ICapabilityRegistry {
  /**
   * Map of adapter types to adapter instances
   */
  private adapters: Map<string, BaseAdapter> = new Map();
  
  /**
   * Map of capability names to capability definitions
   */
  private capabilities: Map<string, AddonCapability> = new Map();
  
  /**
   * LLM adapter for resolving capabilities
   */
  private llmAdapter: LLMAdapter | null = null;
  
  /**
   * Cache of feedback entries
   */
  private feedback: CapabilityFeedback[] = [];
  
  /**
   * Vector store for context action caching
   */
  private vectorStore: VectorStore;
  
  /**
   * Embedding utility
   */
  private embedder: SimpleEmbedding;
  
  /**
   * Cache file path for persisting vectorized actions
   */
  private cacheFilePath: string;
  
  /**
   * Whether vectorized caching is enabled
   */
  private cachingEnabled: boolean;
  
  constructor(options: {
    cachingEnabled?: boolean;
    cacheFilePath?: string;
    embeddingDimension?: number;
  } = {}) {
    this.cachingEnabled = options.cachingEnabled ?? true;
    this.cacheFilePath = options.cacheFilePath || path.join(process.cwd(), '.craft-a-tester', 'capability-cache.json');
    const embeddingDimension = options.embeddingDimension || 384; // Smaller dimension is faster
    
    this.vectorStore = new VectorStore(embeddingDimension);
    this.embedder = new SimpleEmbedding(embeddingDimension);
    
    // Create cache directory if it doesn't exist
    const cacheDir = path.dirname(this.cacheFilePath);
    if (this.cachingEnabled) {
      if (!fs.existsSync(cacheDir)) {
        try {
          fs.mkdirSync(cacheDir, { recursive: true });
        } catch (error) {
          console.warn(`Failed to create cache directory: ${error}`);
          this.cachingEnabled = false;
        }
      }
    }
    
    // Load cache if it exists
    this.loadCache();
  }
  
  /**
   * Set the LLM adapter for capability resolution
   */
  setLLMAdapter(llmAdapter: LLMAdapter): void {
    this.llmAdapter = llmAdapter;
  }
  
  /**
   * Register an adapter
   */
  registerAdapter(type: string, adapter: BaseAdapter): void {
    if (this.adapters.has(type)) {
      console.warn(`Overwriting existing adapter for type ${type}`);
    }
    
    this.adapters.set(type, adapter);
    console.log(`Registered adapter for type ${type}`);
  }
  
  /**
   * Get an adapter by type
   */
  getAdapter<T extends BaseAdapter>(type: string): T | null {
    return (this.adapters.get(type) as T) || null;
  }
  
  /**
   * Register a capability
   */
  registerCapability(capability: AddonCapability): void {
    if (this.capabilities.has(capability.name)) {
      console.warn(`Overwriting existing capability ${capability.name}`);
    }
    
    this.capabilities.set(capability.name, capability);
    console.log(`Registered capability ${capability.name}`);
    
    // Create embeddings for each example
    if (this.cachingEnabled && capability.examples.length > 0) {
      console.log(`Creating embeddings for ${capability.examples.length} examples of ${capability.name}`);
      
      capability.examples.forEach((example, index) => {
        const vector = this.embedder.embed(example);
        const id = `${capability.name}_example_${index}`;
        
        this.vectorStore.addVector(id, vector, {
          capabilityName: capability.name,
          type: 'example',
          text: example
        });
      });
      
      // Save the updated cache
      this.saveCache();
    }
  }
  
  /**
   * Get a capability by name
   */
  getCapability(name: string): AddonCapability | null {
    return this.capabilities.get(name) || null;
  }
  
  /**
   * Get all capabilities
   */
  getAllCapabilities(): AddonCapability[] {
    return Array.from(this.capabilities.values());
  }
  
  /**
   * Get capability context for LLM
   */
  getCapabilityContext(): string {
    const capabilities = this.getAllCapabilities();
    
    if (capabilities.length === 0) {
      return 'No capabilities available.';
    }
    
    let context = `Available capabilities (${capabilities.length}):\n\n`;
    
    capabilities.forEach(capability => {
      context += `## ${capability.name}\n`;
      context += `${capability.descriptions[0]}\n\n`;
      
      if (capability.parameters && capability.parameters.length > 0) {
        context += 'Parameters:\n';
        capability.parameters.forEach(param => {
          context += `- ${param.name} (${param.type}${param.required ? ', required' : ''}): ${param.description}\n`;
        });
        context += '\n';
      }
      
      context += 'Examples:\n';
      capability.examples.forEach(example => {
        context += `- "${example}"\n`;
      });
      
      context += '\n';
    });
    
    return context;
  }
  
  /**
   * Find capability for action using LLM or vector cache
   */
  async findCapabilityForAction(description: string): Promise<{
    capability: AddonCapability;
    parameters: any[];
    confidence: number;
  } | null> {
    if (this.capabilities.size === 0) {
      console.warn('No capabilities registered');
      return null;
    }
    
    // Check if we have a cached capability resolution for a similar action
    if (this.cachingEnabled) {
      const cachedResult = this.findCachedCapability(description);
      if (cachedResult && cachedResult.confidence > 0.85) {
        console.log(`Found cached capability match: ${cachedResult.capability.name} with confidence ${cachedResult.confidence.toFixed(2)}`);
        return {
          capability: cachedResult.capability,
          parameters: cachedResult.parameters || [],
          confidence: cachedResult.confidence
        };
      }
    }
    
    // If no good cache match or caching disabled, use LLM
    if (!this.llmAdapter) {
      throw new Error('No LLM adapter set for capability resolution');
    }
    
    const prompt = this.buildCapabilityResolutionPrompt(description);
    
    try {
      const response = await this.llmAdapter.complete(prompt);
      const result = this.parseCapabilityResolutionResponse(response);
      
      // Cache the result if successful
      if (result && this.cachingEnabled) {
        this.cacheCapabilityResolution(description, result);
      }
      
      return result;
    } catch (error) {
      console.error('Error resolving capability:', error);
      return null;
    }
  }
  
  /**
   * Find a cached capability match for the given description
   */
  private findCachedCapability(description: string): {
    capability: AddonCapability;
    parameters?: any[];
    confidence: number;
  } | null {
    // Skip if no capabilities registered
    if (this.capabilities.size === 0) {
      return null;
    }
    
    // Generate embedding for the description
    const embedding = this.embedder.embed(description);
    
    // Find nearest neighbors in the vector store
    const nearestResults = this.vectorStore.findNearest(embedding, 3);
    
    // If we have no results, return null
    if (nearestResults.length === 0) {
      return null;
    }
    
    // Check if we have a good match (high similarity)
    const bestMatch = nearestResults[0];
    
    // For saved actions (not examples), we can directly use the stored parameters
    if (bestMatch.metadata.type === 'action' && bestMatch.similarity > 0.85) {
      const capability = this.getCapability(bestMatch.metadata.capabilityName);
      if (capability) {
        return {
          capability,
          parameters: bestMatch.metadata.parameters,
          confidence: bestMatch.similarity
        };
      }
    }
    
    // For example matches, find the best matching capability
    const candidateResults = nearestResults.filter(r => r.similarity > 0.8);
    if (candidateResults.length === 0) {
      return null;
    }
    
    // Count capabilities by frequency in the top results
    const capabilityCounts: Record<string, number> = {};
    for (const result of candidateResults) {
      const capName = result.metadata.capabilityName;
      capabilityCounts[capName] = (capabilityCounts[capName] || 0) + 1;
    }
    
    // Find the most frequent capability
    let mostFrequentCapability = '';
    let highestCount = 0;
    for (const [capName, count] of Object.entries(capabilityCounts)) {
      if (count > highestCount) {
        mostFrequentCapability = capName;
        highestCount = count;
      }
    }
    
    if (mostFrequentCapability) {
      const capability = this.getCapability(mostFrequentCapability);
      if (capability) {
        return {
          capability,
          confidence: bestMatch.similarity
        };
      }
    }
    
    return null;
  }
  
  /**
   * Cache a capability resolution result
   */
  private cacheCapabilityResolution(
    description: string,
    result: {
      capability: AddonCapability;
      parameters: any[];
      confidence: number;
    }
  ): void {
    // Generate embedding for the description
    const embedding = this.embedder.embed(description);
    
    // Store in vector database
    const id = `action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.vectorStore.addVector(id, embedding, {
      capabilityName: result.capability.name,
      type: 'action',
      text: description,
      parameters: result.parameters,
      confidence: result.confidence,
      timestamp: Date.now()
    });
    
    // Save the updated cache
    this.saveCache();
  }
  
  /**
   * Build prompt for capability resolution
   */
  private buildCapabilityResolutionPrompt(description: string): string {
    const context = this.getCapabilityContext();
    
    return `
# Capability Resolution

You need to identify the most appropriate testing capability for the following test step:

"${description}"

Here are the available capabilities:

${context}

## Task

1. Analyze the test step and find the most appropriate capability.
2. Determine what parameters should be passed to the capability.
3. Provide your confidence level (0.0 to 1.0) in this match.

Format your response as a JSON object with the following structure:
{
  "capability": "capabilityName",
  "parameters": [param1, param2, ...],
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this capability was selected"
}
`;
  }
  
  /**
   * Parse LLM response for capability resolution
   */
  private parseCapabilityResolutionResponse(response: string): {
    capability: AddonCapability;
    parameters: any[];
    confidence: number;
  } | null {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response');
        return null;
      }
      
      const json = JSON.parse(jsonMatch[0]);
      
      const { capability: capabilityName, parameters, confidence } = json;
      
      if (!capabilityName || !parameters || typeof confidence !== 'number') {
        console.error('Invalid resolution format', json);
        return null;
      }
      
      const capability = this.capabilities.get(capabilityName);
      
      if (!capability) {
        console.error(`Capability ${capabilityName} not found`);
        return null;
      }
      
      return {
        capability,
        parameters,
        confidence
      };
    } catch (error) {
      console.error('Error parsing capability resolution:', error);
      return null;
    }
  }
  
  /**
   * Execute a capability
   */
  async executeCapability(name: string, parameters: any[]): Promise<any> {
    const capability = this.capabilities.get(name);
    
    if (!capability) {
      throw new Error(`Capability ${name} not found`);
    }
    
    return capability.handler(...parameters);
  }
  
  /**
   * Provide feedback on a capability resolution
   */
  async provideFeedback(feedback: CapabilityFeedback): Promise<void> {
    this.feedback.push({
      ...feedback,
      timestamp: feedback.timestamp || Date.now()
    });
    
    console.log(`Received ${feedback.quality} feedback for step ${feedback.stepId}`);
    
    // Store feedback with embedding if caching is enabled
    if (this.cachingEnabled && feedback.description) {
      const embedding = this.embedder.embed(feedback.description);
      
      // Store in vector database
      const id = `feedback_${feedback.stepId || Date.now()}`;
      this.vectorStore.addVector(id, embedding, {
        type: 'feedback',
        quality: feedback.quality,
        capabilityName: feedback.capabilityName,
        text: feedback.description,
        parameters: feedback.parameters,
        timestamp: feedback.timestamp || Date.now()
      });
      
      // If this is negative feedback with cleanup strategy, clean up incorrect cache entries
      if (feedback.quality === 'incorrect' && feedback.cacheStrategy === 'cleanup' && feedback.capabilityName && feedback.description) {
        this.cleanupIncorrectEntries(feedback.description, feedback.capabilityName);
      }
      
      // Save the updated cache
      this.saveCache();
    }
  }
  
  /**
   * Clean up incorrect capability selections by removing similar cache entries
   */
  private cleanupIncorrectEntries(description: string, wrongCapabilityName: string): void {
    // Generate embedding for the description
    const embedding = this.embedder.embed(description);
    
    // Find similar vectors
    const similarVectors = this.vectorStore.findNearest(embedding, 5);
    
    // Get all vectors from the store
    const allVectors = this.vectorStore.getAllVectors();
    
    // Find and remove similar vectors that point to the wrong capability
    const vectorsToRemove: string[] = [];
    
    for (const similar of similarVectors) {
      if (
        similar.similarity > 0.9 && 
        similar.metadata.type === 'action' && 
        similar.metadata.capabilityName === wrongCapabilityName
      ) {
        vectorsToRemove.push(similar.id);
      }
    }
    
    // Remove the identified vectors
    for (const id of vectorsToRemove) {
      this.vectorStore.removeVector(id);
    }
    
    if (vectorsToRemove.length > 0) {
      console.log(`Cleaned up ${vectorsToRemove.length} similar cache entries with wrong capability`);
    }
  }
  
  /**
   * Get feedback for analysis
   */
  getFeedback(): CapabilityFeedback[] {
    return [...this.feedback];
  }
  
  /**
   * Save the cache to disk
   */
  private saveCache(): void {
    if (!this.cachingEnabled) {
      return;
    }
    
    try {
      const cacheData = this.vectorStore.saveToJson();
      fs.writeFileSync(this.cacheFilePath, cacheData, 'utf8');
      console.log(`Cache saved to ${this.cacheFilePath}`);
    } catch (error) {
      console.warn(`Failed to save cache: ${error}`);
    }
  }
  
  /**
   * Load the cache from disk
   */
  private loadCache(): void {
    if (!this.cachingEnabled) {
      return;
    }
    
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const cacheData = fs.readFileSync(this.cacheFilePath, 'utf8');
        this.vectorStore.loadFromJson(cacheData);
        console.log(`Loaded ${this.vectorStore.size()} cached vectors from ${this.cacheFilePath}`);
      }
    } catch (error) {
      console.warn(`Failed to load cache: ${error}`);
    }
  }
  
  /**
   * Clear the cache
   */
  clearCache(): void {
    this.vectorStore.clear();
    console.log('Cache cleared');
    
    if (this.cachingEnabled) {
      this.saveCache();
    }
  }
}