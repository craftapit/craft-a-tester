export interface ScenarioContext {
  environment?: string;
  user?: string;
  featureFlags?: Record<string, boolean | string>;
  [key: string]: any;
}

export type StepType = 'given' | 'when' | 'then' | 'and';

export interface ScenarioStep {
  type: StepType;
  instruction: string;
  details?: Record<string, any>;
  lineNumber?: number;
}

export type TestType = 'ui' | 'api' | 'database' | 'generic' | 'typedapi';

export interface Scenario {
  title: string;
  description?: string;
  context: ScenarioContext;
  steps: ScenarioStep[];
  testType?: TestType;
  filePath?: string;
}
