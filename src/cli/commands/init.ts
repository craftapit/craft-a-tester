import * as fs from 'fs/promises';
import * as path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { Logger } from '../../utils/logger';
import { getTemplateContent } from '../utils/templates';

export async function init(options: any) {
  const logger = new Logger('CLI');
  
  try {
    // Ask for project details if not provided
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'directory',
        message: 'Where would you like to initialize the project?',
        default: options.directory || '.'
      },
      {
        type: 'list',
        name: 'testType',
        message: 'What type of tests are you primarily going to write?',
        choices: ['API', 'UI', 'Database', 'Mixed'],
        default: 'API'
      },
      {
        type: 'list',
        name: 'llmProvider',
        message: 'Which LLM provider would you like to use?',
        choices: ['openai', 'anthropic', 'custom'],
        default: 'openai'
      },
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your API key (or leave blank to use environment variables):',
        default: ''
      },
      {
        type: 'confirm',
        name: 'createExamples',
        message: 'Would you like to create example test scenarios?',
        default: true
      },
      {
        type: 'confirm',
        name: 'integrateCraftACoder',
        message: 'Would you like to integrate with CraftACoder for code generation?',
        default: true
      }
    ]);
    
    const projectDir = path.resolve(answers.directory);
    const spinner = ora(`Initializing project in ${projectDir}...`).start();
    
    // Create directory structure
    await fs.mkdir(path.join(projectDir, 'tests'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'tests', 'scenarios'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'tests', 'results'), { recursive: true });
    
    // Create config file
    const configContent = JSON.stringify({
      browser: answers.testType === 'UI' || answers.testType === 'Mixed' ? {
        headless: false,
        slowMo: 50
      } : undefined,
      api: answers.testType === 'API' || answers.testType === 'Mixed' ? {
        baseUrl: 'https://api.example.com'
      } : undefined,
      database: answers.testType === 'Database' || answers.testType === 'Mixed' ? {
        client: 'sqlite',
        connection: {
          filename: ':memory:'
        }
      } : undefined,
      llm: {
        provider: answers.llmProvider,
        model: answers.llmProvider === 'openai' ? 'gpt-4' : 'claude-2',
        apiKey: answers.apiKey || undefined
      },
      logging: {
        level: 'info',
        screenshots: answers.testType === 'UI' || answers.testType === 'Mixed',
        screenshotsPath: './tests/results/screenshots'
      },
      integrations: {
        craftacoder: answers.integrateCraftACoder ? {
          enabled: true,
          cliPath: 'craftacoder'
        } : undefined
      }
    }, null, 2);
    
    await fs.writeFile(
      path.join(projectDir, 'craft-a-tester.json'),
      configContent
    );
    
    // Create example scenarios if requested
    if (answers.createExamples) {
      spinner.text = 'Creating example scenarios...';
      
      if (answers.testType === 'UI' || answers.testType === 'Mixed') {
        const uiExample = await getTemplateContent('ui-example');
        await fs.writeFile(
          path.join(projectDir, 'tests', 'scenarios', 'login-test.md'),
          uiExample
        );
      }
      
      if (answers.testType === 'API' || answers.testType === 'Mixed') {
        const apiExample = await getTemplateContent('api-example');
        await fs.writeFile(
          path.join(projectDir, 'tests', 'scenarios', 'api-test.md'),
          apiExample
        );
      }
      
      if (answers.testType === 'Database' || answers.testType === 'Mixed') {
        const dbExample = await getTemplateContent('db-example');
        await fs.writeFile(
          path.join(projectDir, 'tests', 'scenarios', 'db-test.md'),
          dbExample
        );
      }
    }
    
    spinner.succeed('Project initialized successfully!');
    
    // Print next steps
    console.log('\n' + chalk.bold('Next steps:'));
    console.log('1. ' + chalk.cyan(`cd ${options.directory !== '.' ? options.directory : ''}`));
    
    if (answers.testType === 'API' || answers.testType === 'Mixed') {
      console.log('2. ' + chalk.cyan('craft-a-tester run ./tests/scenarios/api-test.md'));
    } else {
      console.log('2. ' + chalk.cyan('craft-a-tester run ./tests/scenarios/login-test.md'));
    }
    
    if (answers.integrateCraftACoder) {
      console.log('\nTo use CraftACoder for code generation:');
      console.log(chalk.cyan('craft-a-tester run ./tests/scenarios/api-test.md --generate-code'));
    }
    
    console.log('\nFor more information, see the documentation:');
    console.log(chalk.blue('https://github.com/craftapit/craft-a-tester'));
  } catch (error) {
    logger.error('Error initializing project:', error);
    console.error(chalk.red('Error initializing project:'), error);
    process.exit(1);
  }
}