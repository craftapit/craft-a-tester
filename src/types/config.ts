export interface BrowserConfig {
  headless?: boolean;
  slowMo?: number;
  type?: 'chromium' | 'firefox' | 'webkit';
  timeout?: number;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  model: string;
  apiKey?: string;
  endpoint?: string;
  maxTokens?: number;
}

export interface APIConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface DatabaseConfig {
  client: string;
  connection: any;
  debug?: boolean;
}

export interface LoggingConfig {
  level?: 'debug' | 'info' | 'warn' | 'error';
  screenshots?: boolean;
  screenshotsPath?: string;
}

export interface CraftACoderIntegrationConfig {
  enabled: boolean;
  cliPath?: string;
  workingDir?: string;
}

export interface IntegrationsConfig {
  craftacoder?: CraftACoderIntegrationConfig;
}

export interface TestExecutorConfig {
  browser?: BrowserConfig;
  llm?: LLMConfig;
  api?: APIConfig;
  database?: DatabaseConfig;
  logging?: LoggingConfig;
  integrations?: IntegrationsConfig;
}

// Keep for backward compatibility
export type TestRunnerConfig = TestExecutorConfig;