/**
 * A simple embedding utility that converts text to vector embeddings
 * This is a lightweight alternative to using full ML-based embedding models
 * Note: This produces lower quality embeddings than specialized models but works without external dependencies
 */
export class SimpleEmbedding {
  private dimension: number;
  private seed: number;
  
  /**
   * Create a new SimpleEmbedding instance
   * @param dimension The dimension of the embedding vectors (default: 1536)
   * @param seed Random seed for reproducibility (default: 42)
   */
  constructor(dimension: number = 1536, seed: number = 42) {
    this.dimension = dimension;
    this.seed = seed;
  }
  
  /**
   * Generate an embedding vector for the given text
   * @param text The text to embed
   * @returns Embedding vector
   */
  embed(text: string): number[] {
    // Normalize and clean the text
    const normalizedText = this.normalizeText(text);
    
    // Generate a pseudo-random but deterministic vector based on text content
    return this.generateVector(normalizedText);
  }
  
  /**
   * Normalize and clean text for embedding
   */
  private normalizeText(text: string): string {
    // Convert to lowercase
    let normalized = text.toLowerCase();
    
    // Replace newlines and excess whitespace with single spaces
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Remove common punctuation
    normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    
    // Trim leading/trailing whitespace
    normalized = normalized.trim();
    
    return normalized;
  }
  
  /**
   * Generate a deterministic vector based on text content
   * Uses a simple hashing approach to create vectors that preserve some semantic similarity
   */
  private generateVector(text: string): number[] {
    // Initialize empty vector
    const vector = new Array(this.dimension).fill(0);
    
    // Extract meaningful tokens (words) from the text
    const tokens = text.split(/\s+/);
    
    // Use character n-grams to create more granular features
    const ngrams: string[] = [];
    for (const token of tokens) {
      // Add the token itself
      ngrams.push(token);
      
      // Add character bigrams and trigrams
      if (token.length >= 2) {
        for (let i = 0; i < token.length - 1; i++) {
          ngrams.push(token.substring(i, i + 2));
        }
      }
      
      if (token.length >= 3) {
        for (let i = 0; i < token.length - 2; i++) {
          ngrams.push(token.substring(i, i + 3));
        }
      }
    }
    
    // Use ngrams to fill the vector
    for (const ngram of ngrams) {
      // Use a seeded hash function for deterministic vectors
      const hashValue = this.seededHash(ngram);
      
      // Use the hash to determine vector positions and values
      const position = hashValue % this.dimension;
      const nextPosition = (hashValue * 31) % this.dimension;
      
      // Add small values to those positions
      vector[position] += 0.1;
      vector[nextPosition] -= 0.05;
    }
    
    // Normalize the vector to unit length (critical for cosine similarity)
    return this.normalizeVector(vector);
  }
  
  /**
   * Simple seeded string hash function
   */
  private seededHash(str: string): number {
    let hash = this.seed;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    // Calculate the magnitude
    let magnitude = 0;
    for (let i = 0; i < vector.length; i++) {
      magnitude += vector[i] * vector[i];
    }
    magnitude = Math.sqrt(magnitude);
    
    // Avoid division by zero
    if (magnitude === 0) {
      // Create a random unit vector instead
      const randomVector = new Array(this.dimension).fill(0);
      for (let i = 0; i < randomVector.length; i++) {
        randomVector[i] = Math.random() * 2 - 1;
      }
      return this.normalizeVector(randomVector);
    }
    
    // Normalize
    return vector.map(v => v / magnitude);
  }
}