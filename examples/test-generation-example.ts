import { TestGenerationAgent } from '../src/agents/TestGenerationAgent';
import { ScenarioParser } from '../src/core/ScenarioParser';
import * as fs from 'fs/promises';
import * as path from 'path';

async function demonstrateTestGeneration() {
  console.log('🧪 Demonstrating Test Generation Agent');
  console.log('-------------------------------------');
  
  // Define output directory
  const outputDir = path.join(__dirname, 'output');
  
  // Create a test generation agent
  const agent = new TestGenerationAgent({
    language: 'typescript',
    framework: 'jest',
    testStyle: 'bdd',
    coverage: 'comprehensive',
    includeComments: true
  });
  
  await agent.initialize();
  
  try {
    // Sample implementation code
    const tsImplementation = `
export class Calculator {
  constructor(private initialValue: number = 0) {}
  
  add(value: number): Calculator {
    this.initialValue += value;
    return this;
  }
  
  subtract(value: number): Calculator {
    this.initialValue -= value;
    return this;
  }
  
  multiply(value: number): Calculator {
    this.initialValue *= value;
    return this;
  }
  
  divide(value: number): Calculator {
    if (value === 0) {
      throw new Error('Division by zero');
    }
    this.initialValue /= value;
    return this;
  }
  
  getValue(): number {
    return this.initialValue;
  }
}

export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}
`;

    // Generate tests without a scenario
    console.log('\n📝 Generating tests without a scenario:');
    const testsWithoutScenario = await agent.generateTests(tsImplementation);
    console.log(testsWithoutScenario);
    
    // Parse a test scenario
    const parser = new ScenarioParser();
    const scenarioPath = path.join(__dirname, 'calculator-test.md');
    
    // Create a test scenario file
    await fs.writeFile(scenarioPath, `
# Calculator Test

## Context
- Type: Unit
- Language: TypeScript
- Framework: Jest

## Scenario: Basic Calculator Operations

### Steps

1. **Given** a new Calculator instance with initial value 10
2. **When** I add 5 to the calculator
3. **Then** the result should be 15
4. **When** I subtract 3 from the calculator
5. **Then** the result should be 12
6. **When** I multiply the calculator by 2
7. **Then** the result should be 24
8. **When** I divide the calculator by 4
9. **Then** the result should be 6
`);
    
    const scenario = await parser.parseScenario(scenarioPath);
    
    // Generate tests with a scenario
    console.log('\n📝 Generating tests with a scenario:');
    const testsWithScenario = await agent.generateTests(tsImplementation, scenario);
    console.log(testsWithScenario);
    
    // Save the generated tests
    await fs.mkdir(outputDir, { recursive: true });
    
    await fs.writeFile(
      path.join(outputDir, 'calculator.test.ts'),
      testsWithScenario
    );
    
    console.log('\n✅ Tests generated and saved to examples/output/calculator.test.ts');
    
    // Clean up
    await fs.unlink(scenarioPath);
  } finally {
    await agent.cleanup();
  }
  
  // Python example
  const pythonAgent = new TestGenerationAgent({
    language: 'python',
    framework: 'pytest',
    testStyle: 'bdd',
    coverage: 'comprehensive',
    includeComments: true
  });
  
  await pythonAgent.initialize();
  
  try {
    // Sample Python implementation
    const pyImplementation = `
class Calculator:
    def __init__(self, initial_value=0):
        self.value = initial_value
    
    def add(self, value):
        self.value += value
        return self
    
    def subtract(self, value):
        self.value -= value
        return self
    
    def multiply(self, value):
        self.value *= value
        return self
    
    def divide(self, value):
        if value == 0:
            raise ValueError("Division by zero")
        self.value /= value
        return self
    
    def get_value(self):
        return self.value

def add(a, b):
    return a + b

def subtract(a, b):
    return a - b
`;

    console.log('\n📝 Generating Python tests:');
    const pythonTests = await pythonAgent.generateTests(pyImplementation);
    console.log(pythonTests);
    
    // Save the generated tests
    await fs.writeFile(
      path.join(outputDir, 'test_calculator.py'),
      pythonTests
    );
    
    console.log('\n✅ Python tests generated and saved to examples/output/test_calculator.py');
  } finally {
    await pythonAgent.cleanup();
  }
}

// Run the demonstration
demonstrateTestGeneration().catch(console.error);
