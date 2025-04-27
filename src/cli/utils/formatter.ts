import chalk from 'chalk';
import { TestResult, TestResults } from '../../types/results';

export function formatResults(results: TestResult | TestResults): string {
  if ('total' in results) {
    return formatTestResults(results);
  } else {
    return formatTestResult(results);
  }
}

function formatTestResult(result: TestResult): string {
  const output = [
    chalk.bold(`\nTest Scenario: ${result.scenarioTitle || 'Untitled'}`),
    `Status: ${(result.success || result.passed) ? chalk.green('PASS') : chalk.red('FAIL')}`,
    `Duration: ${formatDuration(result.duration)}`,
    `Started: ${result.startTime ? result.startTime.toLocaleTimeString() : 'N/A'}`,
    `Ended: ${result.endTime ? result.endTime.toLocaleTimeString() : 'N/A'}`,
    '\nStep Results:'
  ];
  
  // Handle both step types
  if (result.stepResults && result.stepResults.length > 0) {
    result.stepResults.forEach((step, index) => {
      const status = step.success 
        ? chalk.green('✓') 
        : chalk.red('✗');
      
      output.push(`${index + 1}. ${status} ${step.step} (${formatDuration(step.duration)})`);
      
      if (!step.success && step.error) {
        output.push(`   ${chalk.red('Error:')} ${step.error}`);
      }
    });
  } else if (result.steps && result.steps.length > 0) {
    result.steps.forEach((step, index) => {
      const status = step.status === 'passed'
        ? chalk.green('✓') 
        : step.status === 'failed' ? chalk.red('✗') : chalk.yellow('⚠');
      
      output.push(`${index + 1}. ${status} ${step.description}`);
      
      if (step.status === 'failed' && step.error) {
        output.push(`   ${chalk.red('Error:')} ${step.error}`);
      }
    });
  }
  
  // Add error if present
  if (result.error) {
    output.push(`\n${chalk.red('Error:')} ${result.error}`);
  }
  
  return output.join('\n');
}

function formatTestResults(results: TestResults): string {
  const output = [
    chalk.bold('\nTest Results Summary'),
    `Total Scenarios: ${results.total}`,
    `Passed: ${chalk.green(results.passed)}`,
    `Failed: ${chalk.red(results.failed)}`,
    `Total Duration: ${formatDuration(results.duration)}`,
    '\nScenario Results:'
  ];
  
  results.results.forEach((result, index) => {
    const status = result.success 
      ? chalk.green('PASS') 
      : chalk.red('FAIL');
    
    output.push(`${index + 1}. ${result.scenarioTitle}: ${status} (${formatDuration(result.duration)})`);
  });
  
  return output.join('\n');
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) {
    return '0ms';
  }
  
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }
}
