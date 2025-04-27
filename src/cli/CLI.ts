import { Command } from 'commander';
import { runScenario } from './commands/run-scenario';
import { runScenarios } from './commands/run-scenarios';
import { init } from './commands/init';
import { addRunTestsCommand } from './commands/run-tests';
import { Logger } from '../utils/logger';

export class CLI {
  private program: Command;
  private logger: Logger;
  
  constructor(version: string) {
    this.program = new Command();
    this.logger = new Logger('CLI');
    
    this.program
      .version(version)
      .description('A focused, LLM-powered testing framework for natural language test scenarios');
    
    this.registerCommands();
  }
  
  private registerCommands(): void {
    // Run single scenario command
    this.program
      .command('run <scenario>')
      .description('Run a single test scenario')
      .option('-c, --config <path>', 'Path to config file')
      .option('-h, --headless', 'Run browser in headless mode')
      .option('-m, --model <model>', 'LLM model to use')
      .option('-p, --provider <provider>', 'LLM provider to use')
      .option('-k, --api-key <key>', 'API key for LLM provider')
      .action(runScenario);
    
    // Run all scenarios command
    this.program
      .command('run-all <directory>')
      .description('Run all test scenarios in a directory')
      .option('-c, --config <path>', 'Path to config file')
      .option('-h, --headless', 'Run browser in headless mode')
      .option('-m, --model <model>', 'LLM model to use')
      .option('-p, --provider <provider>', 'LLM provider to use')
      .option('-k, --api-key <key>', 'API key for LLM provider')
      .option('-r, --recursive', 'Search for scenarios recursively')
      .action(runScenarios);
    
    // Initialize project command
    this.program
      .command('init')
      .description('Initialize a new craft-a-tester project')
      .option('-d, --directory <path>', 'Project directory', '.')
      .action(init);
      
    // Add the new run-tests command
    addRunTestsCommand(this.program);
  }
  
  public parse(argv: string[]): void {
    try {
      this.program.parse(argv);
    } catch (error) {
      this.logger.error('Command execution failed', error);
      process.exit(1);
    }
  }
}