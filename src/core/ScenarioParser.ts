import * as fs from 'fs/promises';
import { Scenario, ScenarioContext, ScenarioStep, TestType } from '../types/scenario';

export class ScenarioParser {
  /**
   * Parse a scenario from a string
   * @param content The scenario content as a string
   * @returns The parsed scenario
   */
  parse(content: string): Scenario {
    const title = this.extractTitle(content);
    const context = this.extractContext(content);
    const steps = this.extractSteps(content);
    const testType = this.extractTestType(content);
    
    return {
      title,
      context,
      steps,
      testType,
      filePath: 'memory' // Since this is parsed from a string, not a file
    };
  }

  /**
   * Parse a scenario from a file
   * @param scenarioPath The path to the scenario file
   * @returns The parsed scenario
   */
  async parseScenario(scenarioPath: string): Promise<Scenario> {
    // Read the scenario file
    const content = await fs.readFile(scenarioPath, 'utf-8');
    
    // This is a placeholder implementation
    // A real implementation would parse the markdown properly
    
    const title = this.extractTitle(content);
    const context = this.extractContext(content);
    const steps = this.extractSteps(content);
    const testType = this.extractTestType(content);
    
    return {
      title,
      context,
      steps,
      testType,
      filePath: scenarioPath
    };
  }
  
  private extractTestType(content: string): TestType {
    const contextMatch = content.match(/## Context\s+([\s\S]*?)(?=##|$)/);
    if (!contextMatch) return 'generic';
    
    const contextContent = contextMatch[1].toLowerCase();
    
    if (contextContent.includes('type: ui') || 
        contextContent.includes('browser') || 
        contextContent.includes('- ui')) {
      return 'ui';
    } else if (contextContent.includes('type: api') || 
               contextContent.includes('api') || 
               contextContent.includes('endpoint')) {
      return 'api';
    } else if (contextContent.includes('type: database') || 
               contextContent.includes('database') || 
               contextContent.includes('sql')) {
      return 'database';
    }
    
    return 'generic';
  }
  
  private extractTitle(content: string): string {
    // Extract the title from the markdown
    const titleMatch = content.match(/^# (.+)$/m);
    return titleMatch ? titleMatch[1].trim() : 'Untitled Scenario';
  }
  
  private extractContext(content: string): ScenarioContext {
    // Extract the context section from the markdown
    const contextMatch = content.match(/## Context\s+([\s\S]*?)(?=##|$)/);
    
    if (!contextMatch) {
      return {};
    }
    
    const contextLines = contextMatch[1].trim().split('\n');
    const context: ScenarioContext = {};
    
    for (const line of contextLines) {
      const itemMatch = line.match(/^- (.+?): (.+)$/);
      if (itemMatch) {
        const [, key, value] = itemMatch;
        context[key.trim()] = value.trim();
      }
    }
    
    return context;
  }
  
  private extractSteps(content: string): ScenarioStep[] {
    // Extract the steps section from the markdown
    const stepsMatch = content.match(/### Steps\s+([\s\S]*?)(?=###|$)/);
    
    if (!stepsMatch) {
      return [];
    }
    
    const stepsContent = stepsMatch[1].trim();
    const stepMatches = Array.from(stepsContent.matchAll(/(\d+)\. \*\*(Given|When|Then|And)\*\* (.+?)(?=\n\d+\. \*\*|\n?$)/gs));
    
    const steps: ScenarioStep[] = [];
    
    for (const match of stepMatches) {
      const [, , type, instruction] = match;
      
      steps.push({
        type: type.toLowerCase() as any,
        instruction: instruction.trim(),
        lineNumber: parseInt(match[1])
      });
    }
    
    return steps;
  }
}
