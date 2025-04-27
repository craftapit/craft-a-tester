export interface ElementDescription {
  tagName?: string;
  id?: string;
  className?: string;
  text?: string;
  role?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  [key: string]: any;
}

export type ActionType = 'click' | 'input' | 'navigate' | 'wait' | 'assert' | 'select' | 'hover' | 'custom';

export interface UIAction {
  actionType: ActionType;
  target?: string | ElementDescription;
  value?: any;
  reasoning?: string;
  confidence?: number;
}

export interface ScreenState {
  url: string;
  title: string;
  elements: Array<{
    tagName: string;
    id?: string;
    className?: string;
    text?: string;
    attributes?: Record<string, string>;
    rect?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    [key: string]: any;
  }>;
}
