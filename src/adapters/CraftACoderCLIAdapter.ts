import { BaseAdapter } from './BaseAdapter';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface CraftACoderConfig {
  cliPath?: string;
  workingDir?: string;
  gitIntegration?: boolean;
  branchPrefix?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export class CraftACoderCLIAdapter extends BaseAdapter {
  private cliPath: string;
  private workingDir: string;
  private sessionId: string | null = null;
  private logger: Logger;
  
  constructor(config: CraftACoderConfig = {}) {
    super(config);
    this.cliPath = config.cliPath || 'craftacoder';
    this.workingDir = config.workingDir || process.cwd();
    this.logger = new Logger('CraftACoderCLIAdapter');
  }
  
  async initialize(): Promise<void> {
    this.logger.info('Initializing CraftACoder CLI adapter');
    
    try {
      // Check if the CLI is installed and accessible
      const { stdout } = await execAsync(`${this.cliPath} --version`);
      this.logger.info(`CraftACoder CLI version: ${stdout.trim()}`);
    } catch (error) {
      this.logger.error('Failed to initialize CraftACoder CLI', error);
      throw new Error('CraftACoder CLI not found or not accessible. Please make sure it is installed and in your PATH.');
    }
  }
  
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up CraftACoder CLI adapter');
    
    if (this.sessionId) {
      try {
        await execAsync(`${this.cliPath} session end --id ${this.sessionId}`, {
          cwd: this.workingDir
        });
        this.logger.info(`Ended session ${this.sessionId}`);
      } catch (error) {
        this.logger.warn(`Failed to end session ${this.sessionId}`, error);
      }
      
      this.sessionId = null;
    }
  }
  
  async startSession(): Promise<string> {
    this.logger.info('Starting new CraftACoder session');
    
    try {
      const { stdout } = await execAsync(`${this.cliPath} session start`, {
        cwd: this.workingDir
      });
      
      // Extract session ID from output
      const sessionMatch = stdout.match(/Session ID: ([a-zA-Z0-9-]+)/);
      if (!sessionMatch) {
        throw new Error('Failed to extract session ID from CLI output');
      }
      
      this.sessionId = sessionMatch[1];
      this.logger.info(`Started session with ID: ${this.sessionId}`);
      
      return this.sessionId;
    } catch (error) {
      this.logger.error('Failed to start CraftACoder session', error);
      throw error;
    }
  }
  
  async generateCode(prompt: string): Promise<string> {
    if (!this.sessionId) {
      throw new Error('No active session. Call startSession() first.');
    }
    
    this.logger.info('Generating code with CraftACoder');
    
    // Write prompt to a temporary file
    const promptFile = path.join(this.workingDir, '.craftacoder-prompt.txt');
    await fs.writeFile(promptFile, prompt);
    
    try {
      const { stdout } = await execAsync(
        `${this.cliPath} generate --session ${this.sessionId} --prompt-file ${promptFile}`,
        { cwd: this.workingDir }
      );
      
      // Clean up the temporary file
      await fs.unlink(promptFile).catch(() => {});
      
      // Extract the generated code files from the output
      const filesGenerated = stdout.match(/Generated file: ([^\n]+)/g);
      if (!filesGenerated) {
        this.logger.warn('No files were generated');
        return '';
      }
      
      const fileList = filesGenerated.map(line => line.replace('Generated file: ', '').trim());
      this.logger.info(`Generated ${fileList.length} files: ${fileList.join(', ')}`);
      
      return fileList.join('\n');
    } catch (error) {
      this.logger.error('Failed to generate code', error);
      // Clean up the temporary file
      await fs.unlink(promptFile).catch(() => {});
      throw error;
    }
  }
  
  async improveCode(feedback: string): Promise<string> {
    if (!this.sessionId) {
      throw new Error('No active session. Call startSession() first.');
    }
    
    this.logger.info('Improving code with CraftACoder');
    
    // Write feedback to a temporary file
    const feedbackFile = path.join(this.workingDir, '.craftacoder-feedback.txt');
    await fs.writeFile(feedbackFile, feedback);
    
    try {
      const { stdout } = await execAsync(
        `${this.cliPath} improve --session ${this.sessionId} --feedback-file ${feedbackFile}`,
        { cwd: this.workingDir }
      );
      
      // Clean up the temporary file
      await fs.unlink(feedbackFile).catch(() => {});
      
      // Extract the improved code files from the output
      const filesImproved = stdout.match(/Improved file: ([^\n]+)/g);
      if (!filesImproved) {
        this.logger.warn('No files were improved');
        return '';
      }
      
      const fileList = filesImproved.map(line => line.replace('Improved file: ', '').trim());
      this.logger.info(`Improved ${fileList.length} files: ${fileList.join(', ')}`);
      
      return fileList.join('\n');
    } catch (error) {
      this.logger.error('Failed to improve code', error);
      // Clean up the temporary file
      await fs.unlink(feedbackFile).catch(() => {});
      throw error;
    }
  }
  
  async runTests(command: string): Promise<{ success: boolean; output: string }> {
    this.logger.info(`Running tests with command: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.workingDir
      });
      
      const output = stdout + (stderr ? `\n${stderr}` : '');
      const success = !output.includes('FAIL') && !output.includes('ERROR');
      
      this.logger.info(`Tests ${success ? 'passed' : 'failed'}`);
      
      return { success, output };
    } catch (error) {
      this.logger.error('Test execution failed', error);
      
      // Even if the command fails, we want to capture the output
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  async explainCode(filePath: string): Promise<string> {
    if (!this.sessionId) {
      throw new Error('No active session. Call startSession() first.');
    }
    
    this.logger.info(`Explaining code in file: ${filePath}`);
    
    try {
      const { stdout } = await execAsync(
        `${this.cliPath} explain --session ${this.sessionId} --file ${filePath}`,
        { cwd: this.workingDir }
      );
      
      return stdout.trim();
    } catch (error) {
      this.logger.error('Failed to explain code', error);
      throw error;
    }
  }
  
  async addFeature(description: string): Promise<string> {
    if (!this.sessionId) {
      throw new Error('No active session. Call startSession() first.');
    }
    
    this.logger.info('Adding feature with CraftACoder');
    
    // Write description to a temporary file
    const descFile = path.join(this.workingDir, '.craftacoder-feature.txt');
    await fs.writeFile(descFile, description);
    
    try {
      const { stdout } = await execAsync(
        `${this.cliPath} feature --session ${this.sessionId} --description-file ${descFile}`,
        { cwd: this.workingDir }
      );
      
      // Clean up the temporary file
      await fs.unlink(descFile).catch(() => {});
      
      // Extract the modified files from the output
      const filesModified = stdout.match(/(Created|Modified) file: ([^\n]+)/g);
      if (!filesModified) {
        this.logger.warn('No files were modified');
        return '';
      }
      
      const fileList = filesModified.map(line => 
        line.replace(/(Created|Modified) file: /, '').trim()
      );
      this.logger.info(`Modified ${fileList.length} files: ${fileList.join(', ')}`);
      
      return fileList.join('\n');
    } catch (error) {
      this.logger.error('Failed to add feature', error);
      // Clean up the temporary file
      await fs.unlink(descFile).catch(() => {});
      throw error;
    }
  }
}
