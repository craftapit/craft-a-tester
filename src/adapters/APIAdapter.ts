import { BaseAdapter } from './BaseAdapter';

export interface APIResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

export interface APIRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
}

export class APIAdapter extends BaseAdapter {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private lastResponse: APIResponse | null = null;

  constructor(config: {
    baseUrl?: string;
    defaultHeaders?: Record<string, string>;
  }) {
    super(config);
    this.baseUrl = config.baseUrl || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders
    };
  }

  async initialize(): Promise<void> {
    console.log('Initializing API adapter');
    // Nothing specific to initialize
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up API adapter');
    // Nothing specific to clean up
  }

  async makeRequest(request: APIRequest): Promise<APIResponse> {
    const url = this.resolveUrl(request.url);
    const headers = { ...this.defaultHeaders, ...request.headers };
    
    console.log(`Making ${request.method} request to ${url}`);
    
    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined
      });
      
      let responseBody;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }
      
      this.lastResponse = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody
      };
      
      return this.lastResponse;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async verifyResponse(
    expectations: {
      status?: number;
      bodyContains?: Record<string, any>;
      bodyMatches?: (body: any) => boolean;
      headerContains?: Record<string, string>;
    }
  ): Promise<{ success: boolean; reason?: string }> {
    if (!this.lastResponse) {
      return { 
        success: false, 
        reason: 'No previous API response to verify' 
      };
    }
    
    // Verify status code
    if (expectations.status && this.lastResponse.status !== expectations.status) {
      return { 
        success: false, 
        reason: `Expected status ${expectations.status} but got ${this.lastResponse.status}` 
      };
    }
    
    // Verify body contains expected properties
    if (expectations.bodyContains) {
      for (const [key, value] of Object.entries(expectations.bodyContains)) {
        if (!this.deepCompare(this.lastResponse.body, key, value)) {
          return { 
            success: false, 
            reason: `Response body missing or has incorrect value for '${key}'` 
          };
        }
      }
    }
    
    // Verify body matches custom function
    if (expectations.bodyMatches && !expectations.bodyMatches(this.lastResponse.body)) {
      return { 
        success: false, 
        reason: 'Response body did not match custom validation function' 
      };
    }
    
    // Verify headers
    if (expectations.headerContains) {
      for (const [key, value] of Object.entries(expectations.headerContains)) {
        const headerKey = Object.keys(this.lastResponse.headers)
          .find(h => h.toLowerCase() === key.toLowerCase());
          
        if (!headerKey || this.lastResponse.headers[headerKey] !== value) {
          return { 
            success: false, 
            reason: `Expected header '${key}' with value '${value}' not found` 
          };
        }
      }
    }
    
    return { success: true };
  }

  getLastResponse(): APIResponse | null {
    return this.lastResponse;
  }

  private resolveUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    let baseUrl = this.baseUrl;
    if (baseUrl.endsWith('/') && path.startsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    return `${baseUrl}${path}`;
  }

  private deepCompare(obj: any, path: string, expectedValue: any): boolean {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (current === undefined || current === null) {
        return false;
      }
      current = current[parts[i]];
    }
    
    const lastPart = parts[parts.length - 1];
    
    if (current === undefined || current === null) {
      return false;
    }
    
    if (typeof expectedValue === 'object' && expectedValue !== null) {
      return JSON.stringify(current[lastPart]) === JSON.stringify(expectedValue);
    }
    
    return current[lastPart] === expectedValue;
  }
}
