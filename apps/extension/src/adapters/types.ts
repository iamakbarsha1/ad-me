export interface AIToolAdapter {
  readonly name: string;
  detect(): Promise<boolean>;
  onThinkingStart(callback: () => void): void;
  onThinkingEnd(callback: () => void): void;
  dispose(): void;
}
