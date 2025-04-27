import * as fs from 'fs/promises';
import * as path from 'path';
import { TestExecutorConfig } from '../../types/config';

export async function loadConfig(
  configPath?: string,
  cliOptions?: any
): Promise<TestExecutorConfig> {
  // Default configuration
  let config: TestExecutorConfig = {
    browser: {
      headless: false
    },
    llm: {
      provider: 'openai',
      model: 'gpt-4'
    },
    logging: {
      level: 'info',
      screenshots: true
    }
  };
  
  // Load from config file if provided
  if (configPath) {
    try {
      const configFile = await fs.readFile(path.resolve(configPath), 'utf-8');
      const fileConfig = JSON.parse(configFile);
      config = mergeConfigs(config, fileConfig);
    } catch (error) {
      console.warn(`Warning: Could not load config file: ${configPath}`);
    }
  } else {
    // Try to load from default locations
    const defaultLocations = [
      './craft-a-tester.json',
      './craftatester.json',
      './config/craft-a-tester.json',
      './.craft-a-tester.json'
    ];
    
    for (const location of defaultLocations) {
      try {
        const configFile = await fs.readFile(path.resolve(location), 'utf-8');
        const fileConfig = JSON.parse(configFile);
        config = mergeConfigs(config, fileConfig);
        break;
      } catch (error) {
        // Ignore errors, just try the next location
      }
    }
  }
  
  // Override with CLI options
  if (cliOptions) {
    if (cliOptions.headless !== undefined) {
      config.browser = { ...config.browser, headless: cliOptions.headless };
    }
    
    if (cliOptions.model || cliOptions.provider || cliOptions.apiKey) {
      config.llm = {
        ...config.llm,
        ...(cliOptions.model && { model: cliOptions.model }),
        ...(cliOptions.provider && { provider: cliOptions.provider }),
        ...(cliOptions.apiKey && { apiKey: cliOptions.apiKey })
      };
    }
  }
  
  // Load API keys from environment if not provided
  if (config.llm && !config.llm.apiKey) {
    if (config.llm.provider === 'openai') {
      config.llm.apiKey = process.env.OPENAI_API_KEY;
    } else if (config.llm.provider === 'anthropic') {
      config.llm.apiKey = process.env.ANTHROPIC_API_KEY;
    }
  }
  
  return config;
}

/**
 * Helper function to merge configs with proper handling of nested properties
 */
function mergeConfigs(baseConfig: any, overrideConfig: any): any {
  const result = { ...baseConfig };
  
  for (const [key, value] of Object.entries(overrideConfig)) {
    // If the override has a property that's an object and not null, and the base has the same property as an object
    if (
      value !== null && 
      typeof value === 'object' && 
      !Array.isArray(value) && 
      result[key] !== null && 
      typeof result[key] === 'object' && 
      !Array.isArray(result[key])
    ) {
      // Recursively merge the nested objects
      result[key] = mergeConfigs(result[key], value);
    } else {
      // Otherwise just override the value
      result[key] = value;
    }
  }
  
  return result;
}