import { BaseAdapter } from './BaseAdapter';

export type DatabaseType = 'mysql' | 'postgres' | 'sqlite' | 'mongodb';

export interface QueryResult {
  rows: any[];
  rowCount?: number;
  fields?: any[];
}

export class DatabaseAdapter extends BaseAdapter {
  private dbType: DatabaseType;
  private connection: any = null;
  private lastResult: QueryResult | null = null;
  private mockMode: boolean;
  private mockResults: Record<string, QueryResult> = {};

  constructor(config: {
    type: DatabaseType;
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    mockMode?: boolean;
    mockResults?: Record<string, QueryResult>;
  }) {
    super(config);
    this.dbType = config.type;
    this.mockMode = config.mockMode || false;
    this.mockResults = config.mockResults || {};
  }

  async initialize(): Promise<void> {
    console.log(`Initializing ${this.dbType} database adapter`);
    
    if (this.mockMode) {
      console.log('Running in mock mode - no actual database connection will be made');
      return;
    }
    
    // In a real implementation, this would establish the database connection
    // based on the database type and connection details
    try {
      // This is just a placeholder - actual implementation would depend on the database driver
      this.connection = { connected: true };
      console.log('Database connection established');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up database adapter');
    
    if (this.mockMode || !this.connection) {
      return;
    }
    
    // In a real implementation, this would close the database connection
    try {
      // This is just a placeholder
      this.connection = null;
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }

  async executeQuery(
    query: string,
    params: any[] = []
  ): Promise<QueryResult> {
    console.log(`Executing query: ${query}`);
    console.log('With parameters:', params);
    
    if (this.mockMode) {
      // In mock mode, return predefined results based on the query
      const mockResult = this.mockResults[query] || { rows: [] };
      this.lastResult = mockResult;
      return mockResult;
    }
    
    if (!this.connection) {
      throw new Error('Database connection not established');
    }
    
    try {
      // This is a placeholder - actual implementation would depend on the database driver
      const result: QueryResult = {
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1
      };
      
      this.lastResult = result;
      return result;
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  async verifyQueryResult(
    expectations: {
      rowCount?: number;
      hasRows?: boolean;
      rowsContain?: Record<string, any>[];
      customValidation?: (result: QueryResult) => boolean;
    }
  ): Promise<{ success: boolean; reason?: string }> {
    if (!this.lastResult) {
      return { 
        success: false, 
        reason: 'No previous query result to verify' 
      };
    }
    
    // Verify row count
    if (expectations.rowCount !== undefined && 
        this.lastResult.rowCount !== expectations.rowCount) {
      return { 
        success: false, 
        reason: `Expected ${expectations.rowCount} rows but got ${this.lastResult.rowCount}` 
      };
    }
    
    // Verify has rows
    if (expectations.hasRows !== undefined) {
      const hasRows = this.lastResult.rows.length > 0;
      if (expectations.hasRows !== hasRows) {
        return { 
          success: false, 
          reason: expectations.hasRows 
            ? 'Expected rows but got none' 
            : 'Expected no rows but got some' 
        };
      }
    }
    
    // Verify rows contain expected data
    if (expectations.rowsContain) {
      for (const expectedRow of expectations.rowsContain) {
        const matchingRow = this.lastResult.rows.find(row => {
          return Object.entries(expectedRow).every(([key, value]) => row[key] === value);
        });
        
        if (!matchingRow) {
          return { 
            success: false, 
            reason: `Could not find row matching ${JSON.stringify(expectedRow)}` 
          };
        }
      }
    }
    
    // Custom validation
    if (expectations.customValidation && 
        !expectations.customValidation(this.lastResult)) {
      return { 
        success: false, 
        reason: 'Custom validation failed' 
      };
    }
    
    return { success: true };
  }

  getLastResult(): QueryResult | null {
    return this.lastResult;
  }
}
