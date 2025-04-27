/**
 * Result of a test step execution
 */
export interface StepResult {
  step: string;
  success: boolean;
  error?: string;
  screenshot?: string;
  duration: number;
}

/**
 * Alternative step result format used by TestExecutor
 */
export interface ExecutorStepResult {
  description: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  output?: any;
}

/**
 * Result of a test execution
 */
export interface TestResult {
  // Original fields
  scenarioTitle?: string;
  success?: boolean;
  stepResults?: StepResult[];
  duration?: number;
  startTime?: Date;
  endTime?: Date;
  
  // New fields used by TestRunner
  passed: boolean;
  steps: ExecutorStepResult[];
  error?: string;
}

/**
 * Collection of test results
 */
export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
  duration: number;
}
