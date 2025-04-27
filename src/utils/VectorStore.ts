/**
 * A simple vector store implementation for context action caching
 * This provides a lightweight alternative to full vector database implementations
 * when you need to store and query embeddings
 */
export class VectorStore {
  private vectors: Array<{
    id: string;
    vector: number[];
    metadata: Record<string, any>;
  }> = [];
  
  private dimension: number;
  
  constructor(dimension: number = 1536) {
    this.dimension = dimension;
  }
  
  /**
   * Add a vector to the store
   * @param id Unique identifier for the vector
   * @param vector The embedding vector
   * @param metadata Additional metadata to store with the vector
   */
  addVector(id: string, vector: number[], metadata: Record<string, any> = {}): void {
    if (vector.length !== this.dimension) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimension}, got ${vector.length}`);
    }
    
    // Check if vector with same ID already exists
    const existingIndex = this.vectors.findIndex(v => v.id === id);
    if (existingIndex !== -1) {
      // Replace existing vector
      this.vectors[existingIndex] = { id, vector, metadata };
    } else {
      // Add new vector
      this.vectors.push({ id, vector, metadata });
    }
  }
  
  /**
   * Remove a vector from the store
   * @param id The ID of the vector to remove
   * @returns true if the vector was removed, false if it wasn't found
   */
  removeVector(id: string): boolean {
    const initialLength = this.vectors.length;
    this.vectors = this.vectors.filter(v => v.id !== id);
    return this.vectors.length !== initialLength;
  }
  
  /**
   * Find the nearest neighbors to a query vector
   * @param queryVector The query vector
   * @param k The number of neighbors to return
   * @returns The k nearest neighbors
   */
  findNearest(queryVector: number[], k: number = 5): Array<{
    id: string;
    similarity: number;
    metadata: Record<string, any>;
  }> {
    if (queryVector.length !== this.dimension) {
      throw new Error(`Query vector dimension mismatch: expected ${this.dimension}, got ${queryVector.length}`);
    }
    
    if (this.vectors.length === 0) {
      return [];
    }
    
    // Calculate cosine similarity for all vectors
    const similarities = this.vectors.map(item => {
      const similarity = this.cosineSimilarity(queryVector, item.vector);
      return {
        id: item.id,
        similarity,
        metadata: item.metadata
      };
    });
    
    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return the top k results
    return similarities.slice(0, k);
  }
  
  /**
   * Calculate the cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity (-1 to 1, where 1 is identical)
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  /**
   * Get all vectors in the store
   * @returns All vectors
   */
  getAllVectors(): Array<{
    id: string;
    vector: number[];
    metadata: Record<string, any>;
  }> {
    return [...this.vectors];
  }
  
  /**
   * Get the number of vectors in the store
   * @returns The number of vectors
   */
  size(): number {
    return this.vectors.length;
  }
  
  /**
   * Clear all vectors from the store
   */
  clear(): void {
    this.vectors = [];
  }
  
  /**
   * Save the vector store to a JSON string
   * @returns JSON string representation of the vector store
   */
  saveToJson(): string {
    return JSON.stringify({
      dimension: this.dimension,
      vectors: this.vectors
    });
  }
  
  /**
   * Load the vector store from a JSON string
   * @param json JSON string representation of the vector store
   */
  loadFromJson(json: string): void {
    const data = JSON.parse(json);
    if (data.dimension !== this.dimension) {
      throw new Error(`Dimension mismatch: store is ${this.dimension}, loaded data is ${data.dimension}`);
    }
    this.vectors = data.vectors;
  }
}