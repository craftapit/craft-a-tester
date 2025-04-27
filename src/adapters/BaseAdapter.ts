export abstract class BaseAdapter {
  protected config: any;
  
  constructor(config: any) {
    this.config = config;
  }
  
  abstract initialize(): Promise<void>;
  abstract cleanup(): Promise<void>;
}
