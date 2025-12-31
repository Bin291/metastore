export interface SagaStep {
  stepNumber: number;
  name: string;
  execute: (data: any) => Promise<any>;
  compensate?: (data: any, compensationData: any) => Promise<void>;
}

export interface SagaDefinition {
  sagaType: string;
  steps: SagaStep[];
}

