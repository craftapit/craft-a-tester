import { BaseAdapter } from '../adapters/BaseAdapter';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface CraftACoderIntegrationConfig {
  cliPath?: string;
  workingDir?: string;
  model?: string;
  timeout?: number;
  routerApiKey?: string;
  routerUrl?: string;
}

/**
 * Integration with CraftACoder CLI for passing test scenarios
 * to the code generation tool
 */
export class CraftACoderIntegration extends BaseAdapter {
  private cliPath: string;
  private workingDir: string;
  private logger: Logger;
  private model: string;
  private timeout: number;
  private routerApiKey: string | undefined;
  private routerUrl: string | undefined;
  
  constructor(config: CraftACoderIntegrationConfig = {}) {
    super(config);
    this.cliPath = config.cliPath || 'craftacoder';
    this.workingDir = config.workingDir || process.cwd();
    this.model = config.model || 'claude-3-5-sonnet-20240620'; // Default to a more widely available model
    this.timeout = config.timeout || 600000; // 10 minutes default timeout for long-running tasks
    this.routerApiKey = config.routerApiKey || process.env.CRAFTACODER_ROUTER_API_KEY;
    this.routerUrl = config.routerUrl || process.env.CRAFTACODER_ROUTER_URL || 'https://coder-api.craftapit.com';
    this.logger = new Logger('CraftACoderIntegration');
  }
  
  async initialize(): Promise<void> {
    this.logger.info('Initializing CraftACoder integration');
    
    try {
      // Check if the CLI is installed and accessible
      const { stdout } = await execAsync(`${this.cliPath} --version`);
      this.logger.info(`CraftACoder CLI version: ${stdout.trim()}`);
      
      // Validate that router API key is available
      if (!this.routerApiKey) {
        this.logger.warn('No router API key found. Please set CRAFTACODER_ROUTER_API_KEY env var or pass routerApiKey in config');
      }
    } catch (error) {
      this.logger.error('Failed to initialize CraftACoder CLI', error);
      throw new Error('CraftACoder CLI not found or not accessible. Please make sure it is installed and in your PATH.');
    }
  }
  
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up CraftACoder integration');
    // No specific cleanup needed
  }
  
  /**
   * Create a prompt from a test scenario file
   */
  private async createPromptFromScenario(scenarioPath: string): Promise<string> {
    try {
      const scenarioContent = await fs.readFile(scenarioPath, 'utf-8');
      
      // Create a prompt that instructs craftacoder how to implement the test
      const prompt = `
I have a test scenario written in Given-When-Then format that I need to implement:

${scenarioContent}

Please help me implement the necessary code to make this test pass. 
Focus on implementing just enough code to make the test pass.
After you've analyzed the test, let me know:

1. What files need to be created or modified
2. The implementation code for each file
3. How to run the test to verify it works

Let me know if you need any additional information about the test scenario.
`;
      
      return prompt;
    } catch (error) {
      this.logger.error(`Failed to read scenario file: ${scenarioPath}`, error);
      throw error;
    }
  }
  
  /**
   * Use craftacoder in non-interactive mode to process a prompt using the ask mode
   */
  /**
   * Clean up old temporary prompt files to avoid clutter
   */
  private async cleanupOldPromptFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.workingDir);
      const oldPromptFiles = files.filter(file => 
        file.startsWith('.craft-a-tester-') && 
        file.endsWith('.txt')
      );
      
      // Keep only the 10 most recent files, delete the rest
      if (oldPromptFiles.length > 10) {
        // Get file stats to sort by creation time
        const fileStats = await Promise.all(
          oldPromptFiles.map(async file => {
            const filePath = path.join(this.workingDir, file);
            const stats = await fs.stat(filePath);
            return { file, path: filePath, ctime: stats.ctime };
          })
        );
        
        // Sort by creation time, newest first
        fileStats.sort((a, b) => b.ctime.getTime() - a.ctime.getTime());
        
        // Delete older files (keep the 10 newest)
        const filesToDelete = fileStats.slice(10);
        for (const fileInfo of filesToDelete) {
          await fs.unlink(fileInfo.path).catch(() => {});
          this.logger.info(`Cleaned up old prompt file: ${fileInfo.file}`);
        }
      }
    } catch (error) {
      // Just log the error, don't fail if cleanup fails
      this.logger.warn('Failed to clean up old prompt files', error);
    }
  }

  private async runCraftacoderAskMode(prompt: string): Promise<string> {
    this.logger.info('Running craftacoder in ask mode');
    
    // Clean up old prompt files
    await this.cleanupOldPromptFiles();
    
    // Create a timestamped, uniquely named file for the prompt
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueId = Math.random().toString(36).substring(2, 10);
    const promptFile = path.join(this.workingDir, `.craft-a-tester-ask-prompt-${timestamp}-${uniqueId}.txt`);
    await fs.writeFile(promptFile, prompt);
    
    try {
      // Build the craftacoder command with all necessary parameters
      let craftacoderCmd = this.cliPath;
      let craftacoderArgs: string[] = [
        '--model', this.model,
        '--chat-mode', 'ask',  // Explicitly use ask mode
        '--message-file', promptFile,
        '--yes-always',        // Auto-confirm any prompts
        '--no-fancy-input',    // Disable interactive features
        '--no-git',            // Disable git functionality to avoid prompts
        '--auto-accept-architect' // Auto-accept architect suggestions
      ];
      
      // Add router URL and API key if available
      if (this.routerUrl) {
        craftacoderArgs.push('--router-url', this.routerUrl);
      }
      
      if (this.routerApiKey) {
        craftacoderArgs.push('--router-api-key', this.routerApiKey);
      }
      
      this.logger.info(`Running command: ${craftacoderCmd} ${craftacoderArgs.join(' ')}`);
      
      return new Promise((resolve, reject) => {
        let output = '';
        let errorOutput = '';
        let debugLog = '';
        
        const process = spawn(craftacoderCmd, craftacoderArgs, {
          cwd: this.workingDir
        });
        
        // Collect stdout
        process.stdout.on('data', (data) => {
          const chunk = data.toString();
          output += chunk;
          debugLog += `[STDOUT] ${chunk}\n`;
          this.logger.info(`Craftacoder output: ${chunk.trim()}`);
        });
        
        // Collect stderr
        process.stderr.on('data', (data) => {
          const chunk = data.toString();
          errorOutput += chunk;
          debugLog += `[STDERR] ${chunk}\n`;
          this.logger.warn(`Craftacoder error: ${chunk.trim()}`);
        });
        
        // Handle process completion
        process.on('close', (code) => {
          // Delete the temporary prompt file
          fs.unlink(promptFile).catch(() => {});
          
          this.logger.info(`Craftacoder ask process exited with code ${code}`);
          
          // Save debug log for inspection if needed
          const debugLogPath = path.join(this.workingDir, '.craftacoder-debug.log');
          fs.writeFile(debugLogPath, debugLog).catch(() => {});
          this.logger.info(`Debug log written to ${debugLogPath}`);
          
          if (code !== 0) {
            this.logger.error(`Craftacoder ask process failed with code ${code}`);
            this.logger.error(`Error output: ${errorOutput}`);
            reject(new Error(`Craftacoder ask process failed with code ${code}. Check ${debugLogPath} for details.`));
            return;
          }
          
          this.logger.info('Craftacoder ask process completed successfully');
          resolve(output);
        });
        
        // Set timeout
        const timeoutId = setTimeout(() => {
          this.logger.error(`Craftacoder process timed out after ${this.timeout}ms`);
          // Save debug log before killing the process
          const debugLogPath = path.join(this.workingDir, '.craftacoder-timeout-debug.log');
          fs.writeFile(debugLogPath, debugLog).catch(() => {});
          this.logger.info(`Timeout debug log written to ${debugLogPath}`);
          
          process.kill();
          fs.unlink(promptFile).catch(() => {});
          reject(new Error(`Craftacoder ask process timed out after ${this.timeout}ms. Check ${debugLogPath} for details.`));
        }, this.timeout);
        
        // Clear timeout if process completes
        process.on('close', () => {
          clearTimeout(timeoutId);
        });
      });
    } catch (error) {
      // Ensure we clean up the prompt file
      await fs.unlink(promptFile).catch(() => {});
      this.logger.error('Failed to run craftacoder in ask mode', error);
      throw error;
    }
  }
  
  /**
   * Use craftacoder in non-interactive mode to implement code using architect mode
   */
  private async runCraftacoderArchitectMode(prompt: string, filesToAdd: string[] = []): Promise<string> {
    this.logger.info('Running craftacoder in architect mode');
    
    // Create a timestamped, uniquely named file for the prompt
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueId = Math.random().toString(36).substring(2, 10);
    const promptFile = path.join(this.workingDir, `.craft-a-tester-architect-prompt-${timestamp}-${uniqueId}.txt`);
    await fs.writeFile(promptFile, prompt);
    
    try {
      // Build the craftacoder command with all necessary parameters
      let craftacoderCmd = this.cliPath;
      let craftacoderArgs: string[] = [
        '--model', this.model,
        '--chat-mode', 'architect',  // Explicitly use architect mode
        '--message-file', promptFile,
        '--yes-always',              // Auto-confirm any prompts
        '--no-fancy-input',          // Disable interactive features
        '--no-git',                  // Disable git functionality to avoid interactive prompts
        '--auto-accept-architect'      // Auto-accept architect suggestions
      ];
      
      // Add files to the session if provided
      for (const file of filesToAdd) {
        craftacoderArgs.push('--file', file);
      }
      
      // Add router URL and API key if available
      if (this.routerUrl) {
        craftacoderArgs.push('--router-url', this.routerUrl);
      }
      
      if (this.routerApiKey) {
        craftacoderArgs.push('--router-api-key', this.routerApiKey);
      }
      
      this.logger.info(`Running command: ${craftacoderCmd} ${craftacoderArgs.join(' ')}`);
      
      return new Promise((resolve, reject) => {
        let output = '';
        let errorOutput = '';
        let debugLog = '';
        
        const process = spawn(craftacoderCmd, craftacoderArgs, {
          cwd: this.workingDir
        });
        
        // Collect stdout
        process.stdout.on('data', (data) => {
          const chunk = data.toString();
          output += chunk;
          debugLog += `[STDOUT] ${chunk}\n`;
          this.logger.info(`Craftacoder output: ${chunk.trim()}`);
        });
        
        // Collect stderr
        process.stderr.on('data', (data) => {
          const chunk = data.toString();
          errorOutput += chunk;
          debugLog += `[STDERR] ${chunk}\n`;
          this.logger.warn(`Craftacoder error: ${chunk.trim()}`);
        });
        
        // Handle process completion
        process.on('close', (code) => {
          // Delete the temporary prompt file
          fs.unlink(promptFile).catch(() => {});
          
          this.logger.info(`Craftacoder architect process exited with code ${code}`);
          
          // Save debug log for inspection if needed
          const debugLogPath = path.join(this.workingDir, '.craftacoder-architect-debug.log');
          fs.writeFile(debugLogPath, debugLog).catch(() => {});
          this.logger.info(`Debug log written to ${debugLogPath}`);
          
          if (code !== 0) {
            this.logger.error(`Craftacoder architect process failed with code ${code}`);
            this.logger.error(`Error output: ${errorOutput}`);
            reject(new Error(`Craftacoder architect process failed with code ${code}. Check ${debugLogPath} for details.`));
            return;
          }
          
          this.logger.info('Craftacoder architect process completed successfully');
          resolve(output);
        });
        
        // Set timeout
        const timeoutId = setTimeout(() => {
          this.logger.error(`Craftacoder architect process timed out after ${this.timeout}ms`);
          // Save debug log before killing the process
          const debugLogPath = path.join(this.workingDir, '.craftacoder-architect-timeout-debug.log');
          fs.writeFile(debugLogPath, debugLog).catch(() => {});
          this.logger.info(`Timeout debug log written to ${debugLogPath}`);
          
          process.kill();
          fs.unlink(promptFile).catch(() => {});
          reject(new Error(`Craftacoder architect process timed out after ${this.timeout}ms. Check ${debugLogPath} for details.`));
        }, this.timeout);
        
        // Clear timeout if process completes
        process.on('close', () => {
          clearTimeout(timeoutId);
        });
      });
    } catch (error) {
      // Ensure we clean up the prompt file
      await fs.unlink(promptFile).catch(() => {});
      this.logger.error('Failed to run craftacoder in architect mode', error);
      throw error;
    }
  }
  
  /**
   * Pass a test scenario to CraftACoder for code generation using the two-step process:
   * 1. Ask mode for planning
   * 2. Architect mode for implementation
   */
  async generateFromTest(scenarioPath: string): Promise<string> {
    this.logger.info(`Generating implementation for test scenario: ${scenarioPath}`);
    
    try {
      // Create a prompt for the ask mode (planning phase)
      const askPrompt = await this.createAskPrompt(scenarioPath);
      
      // First, run craftacoder in ask mode to create a plan
      this.logger.info('Step 1: Planning with ask mode');
      const askOutput = await this.runCraftacoderAskMode(askPrompt);
      
      // Extract files mentioned in the planning phase
      const filesPattern = /(?:create|modify|implement|file|need to|should).*?['"](.*?\.(?:js|ts|jsx|tsx|py|rb|go|java|php|html|css|json))['"]|file: ([^ \n]+\.[a-z]{1,5})/gi;
      const matches = [...askOutput.matchAll(filesPattern)];
      
      const filesToAdd: string[] = [];
      if (matches.length > 0) {
        const filesMentioned = matches
          .map(match => match[1] || match[2])
          .filter(Boolean)
          .map(file => file.trim());
        
        this.logger.info(`Files mentioned in planning phase: ${filesMentioned.join(', ')}`);
        
        // Add existing files to the list to avoid duplications
        for (const file of filesMentioned) {
          try {
            const filePath = path.join(this.workingDir, file);
            const stats = await fs.stat(filePath).catch(() => null);
            if (stats && stats.isFile()) {
              filesToAdd.push(file);
              this.logger.info(`Will add existing file to architect session: ${file}`);
            }
          } catch (error) {
            // Ignore errors - just tracking existing files
          }
        }
      } else {
        this.logger.warn('No specific files were mentioned in the planning phase');
      }
      
      // Create a prompt for the architect mode (implementation phase)
      const architectPrompt = this.createArchitectPrompt(askOutput);
      
      // Now, run craftacoder in architect mode to implement the plan
      this.logger.info('Step 2: Implementation with architect mode');
      const architectOutput = await this.runCraftacoderArchitectMode(architectPrompt, filesToAdd);
      
      // Combine the outputs for comprehensive information
      const combinedOutput = `
=== ASK MODE (PLANNING) ===
${askOutput}

=== ARCHITECT MODE (IMPLEMENTATION) ===
${architectOutput}
`;
      
      return combinedOutput;
    } catch (error) {
      this.logger.error('Code generation failed', error);
      return error instanceof Error ? error.message : String(error);
    }
  }
  
  /**
   * Create a prompt for the ask mode (planning phase)
   */
  private async createAskPrompt(scenarioPath: string): Promise<string> {
    const scenarioContent = await fs.readFile(scenarioPath, 'utf-8');
    
    return `
I need to implement code to make the following test scenario pass:

${scenarioContent}

Please analyze this test scenario and create a detailed plan for implementation. I need:

1. A list of all files that need to be created or modified
2. For each file, describe the purpose and what needs to be implemented
3. Any design patterns or architectural considerations I should follow
4. Any dependencies or libraries I might need
5. A step-by-step implementation plan

Focus on creating a thorough plan that addresses all the requirements in the test scenario. 
Break down complex tasks into manageable steps.

After outlining your plan, please review it once more and consider if there's anything important 
missing or if any parts of the plan could be simplified. Then provide a final, refined plan that 
represents your best recommendation for implementing this test scenario.

We'll implement the actual code in the next step using your plan as a guide.
`;
  }
  
  /**
   * Create a prompt for the architect mode (implementation phase)
   */
  private createArchitectPrompt(askOutput: string): string {
    return `
I've created a detailed plan for implementing code to make our test scenario pass. Here's the plan:

${askOutput}

Now I'd like you to implement this plan. Please:

1. Create all the needed files with proper implementations
2. Make sure the code follows best practices
3. Implement just enough to make the tests pass
4. Create any necessary mock APIs or test utilities

As you implement, please check if the plan is complete or if adjustments are needed. If you find any gaps or issues with the plan, feel free to address them in your implementation.

After your implementation, please verify if all requirements from the original test scenario are met.
`;
  }
  
  /**
   * Run tests using command-line
   */
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
  
  /**
   * Extract and implement code suggestions from craftacoder output
   * This is an optional helper method that can be used to automatically 
   * extract file content suggestions from the output and create/modify files
   */
  async extractAndImplementSuggestions(output: string): Promise<string[]> {
    this.logger.info('Extracting and implementing code suggestions');
    
    const fileBlocks = this.extractFileBlocks(output);
    const implementedFiles: string[] = [];
    
    for (const { filename, content } of fileBlocks) {
      try {
        // Create directory if it doesn't exist
        const dir = path.dirname(path.join(this.workingDir, filename));
        await fs.mkdir(dir, { recursive: true });
        
        // Write the file
        await fs.writeFile(path.join(this.workingDir, filename), content);
        this.logger.info(`Created/updated file: ${filename}`);
        implementedFiles.push(filename);
      } catch (error) {
        this.logger.error(`Failed to create/update file: ${filename}`, error);
      }
    }
    
    return implementedFiles;
  }
  
  /**
   * Extract file blocks from craftacoder output
   */
  private extractFileBlocks(output: string): Array<{ filename: string, content: string }> {
    const fileBlocks: Array<{ filename: string, content: string }> = [];
    
    // Match patterns like:
    // ```filename.ts
    // content
    // ```
    // Also try to handle cases where model might use different formats
    const codeBlockPattern = /```(?:(?:typescript|javascript|python|ruby|html|css|json|jsx|tsx|go|java|php|)\s+)?([a-zA-Z0-9_\-/\\\.]+\.[a-z]{1,5})\s*\n([\s\S]*?)```/g;
    
    let match;
    while ((match = codeBlockPattern.exec(output)) !== null) {
      const [, filename, content] = match;
      if (filename && content) {
        fileBlocks.push({
          filename: filename.trim(),
          content: content.trim()
        });
      }
    }
    
    // Also try to match file names and content without proper code block formatting
    if (fileBlocks.length === 0) {
      // Fallback pattern for less structured outputs
      const fallbackPattern = /(?:file|filename|path)[:\s]+['"]*([a-zA-Z0-9_\-/\\\.]+\.[a-z]{1,5})['"]*\s*[\n:]\s*([\s\S]*?)(?=(?:file|filename|path)[:\s]+['"]*[a-zA-Z0-9_\-/\\\.]+\.[a-z]{1,5}['"]*|$)/gi;
      
      while ((match = fallbackPattern.exec(output)) !== null) {
        const [, filename, content] = match;
        if (filename && content && content.trim().length > 0) {
          fileBlocks.push({
            filename: filename.trim(),
            content: content.trim()
          });
        }
      }
    }
    
    return fileBlocks;
  }
}