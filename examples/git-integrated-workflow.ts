import { TestRunner } from '../src';
import { AnthropicAdapter } from '../src/adapters/AnthropicAdapter';
import { BrowserAdapter } from '../src/adapters/BrowserAdapter';
import { APIAdapter } from '../src/adapters/APIAdapter';
import { CraftACoderCLIAdapter } from '../src/adapters/CraftACoderCLIAdapter';
import { IntegratedWorkflow } from '../src/core/IntegratedWorkflow';
import { TypeScriptAdapter } from '../src/adapters/TypeScriptAdapter';
import { PythonAdapter } from '../src/adapters/PythonAdapter';
import * as path from 'path';
import * as fs from 'fs/promises';

async function createTestScenario(
  outputPath: string,
  language: string,
  framework: string,
  type: string,
  title: string,
  steps: string[]
): Promise<string> {
  const content = `# ${title}

## Context
- Environment: Test
- Language: ${language}
- Framework: ${framework}
- Type: ${type}

## Scenario: ${title}

### Steps

${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}
`;

  await fs.writeFile(outputPath, content);
  return outputPath;
}

async function demonstrateGitIntegratedWorkflow() {
  console.log('🚀 Demonstrating the Git-Integrated Craft-a-Tester Workflow');
  console.log('----------------------------------------------------------');
  
  // Initialize the test runner
  const runner = new TestRunner({
    llm: {
      provider: 'anthropic',
      model: 'claude-2',
      apiKey: process.env.ANTHROPIC_API_KEY
    }
  });
  
  // Register adapters
  const llmAdapter = new AnthropicAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-2'
  });
  
  const browserAdapter = new BrowserAdapter({
    headless: false
  });
  
  const apiAdapter = new APIAdapter({
    baseUrl: 'http://localhost:3000'
  });
  
  const tsAdapter = new TypeScriptAdapter();
  const pythonAdapter = new PythonAdapter();
  
  runner.registerAdapter('llm', llmAdapter);
  runner.registerAdapter('browser', browserAdapter);
  runner.registerAdapter('api', apiAdapter);
  runner.registerAdapter('typescript', tsAdapter);
  runner.registerAdapter('python', pythonAdapter);
  
  // Initialize the Craft-a-Coder CLI adapter
  const codeAdapter = new CraftACoderCLIAdapter({
    cliPath: process.env.CRAFTACODER_CLI_PATH || 'craftacoder',
    workingDir: process.cwd(),
    gitIntegration: true,
    branchPrefix: 'feature/craftacoder-'
  });
  
  // Create the integrated workflow
  const workflow = new IntegratedWorkflow(
    runner,
    codeAdapter,
    {
      repositoryPath: process.cwd(),
      branchPrefix: 'feature/'
    }
  );
  
  // Example 1: TypeScript API Endpoint
  console.log('\n📝 Example 1: TypeScript API Endpoint');
  console.log('-----------------------------------');
  
  const tsScenarioPath = path.join(process.cwd(), 'examples', 'ts-api-scenario.md');
  
  await createTestScenario(
    tsScenarioPath,
    'TypeScript',
    'Express',
    'API',
    'User Registration API',
    [
      '**Given** the Express server is running',
      '**When** I send a POST request to "/api/users" with body:\n```json\n{\n  "username": "testuser",\n  "email": "test@example.com",\n  "password": "securepassword"\n}\n```',
      '**Then** the response status should be 201',
      '**And** the response should contain a user ID',
      '**When** I send a GET request to "/api/users/{id}"',
      '**Then** the response status should be 200',
      '**And** the response should contain the username "testuser"'
    ]
  );
  
  try {
    console.log('Running TypeScript API workflow...');
    
    const tsResult = await workflow.runWorkflow({
      repositoryPath: process.cwd(),
      testScenarioPath: tsScenarioPath,
      language: 'typescript',
      framework: 'express',
      iterations: 2,
      createPullRequest: true
    });
    
    console.log(`\n✅ TypeScript API Results:`);
    console.log(`Branch created: ${tsResult.branchInfo?.name}`);
    console.log(`Tests passing: ${tsResult.success}`);
    console.log(`Files changed: ${tsResult.changes.files.length}`);
    console.log(`Pull request: ${tsResult.pullRequestUrl || 'Not created'}`);
  } catch (error) {
    console.error('TypeScript workflow failed:', error);
  }
  
  // Example 2: Python Data Processing
  console.log('\n📝 Example 2: Python Data Processing');
  console.log('----------------------------------');
  
  const pyScenarioPath = path.join(process.cwd(), 'examples', 'py-data-scenario.md');
  
  await createTestScenario(
    pyScenarioPath,
    'Python',
    'Pandas',
    'Data',
    'CSV Data Processor',
    [
      '**Given** I have a CSV file with columns "name", "age", "salary"',
      '**When** I process the file with the data processor',
      '**Then** the output should contain summary statistics',
      '**And** the average salary should be calculated correctly',
      '**When** I filter for people older than 30',
      '**Then** the result should only include matching records',
      '**And** the count of records should be correct'
    ]
  );
  
  try {
    console.log('Running Python Data Processing workflow...');
    
    const pyResult = await workflow.runWorkflow({
      repositoryPath: process.cwd(),
      testScenarioPath: pyScenarioPath,
      language: 'python',
      framework: 'pandas',
      iterations: 2,
      createPullRequest: true
    });
    
    console.log(`\n✅ Python Data Processing Results:`);
    console.log(`Branch created: ${pyResult.branchInfo?.name}`);
    console.log(`Tests passing: ${pyResult.success}`);
    console.log(`Files changed: ${pyResult.changes.files.length}`);
    console.log(`Pull request: ${pyResult.pullRequestUrl || 'Not created'}`);
  } catch (error) {
    console.error('Python workflow failed:', error);
  }
  
  console.log('\n🎉 Demonstration completed!');
}

demonstrateGitIntegratedWorkflow().catch(console.error);
