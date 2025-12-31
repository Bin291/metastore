import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SagaInstance } from '../../entities/saga-instance.entity';
import { SagaStatus } from '../../common/enums/saga-status.enum';
import { SagaDefinition, SagaStep } from './saga-step.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SagaOrchestratorService {
  private readonly logger = new Logger(SagaOrchestratorService.name);
  private readonly sagaDefinitions = new Map<string, SagaDefinition>();

  constructor(
    @InjectRepository(SagaInstance)
    private readonly sagaRepository: Repository<SagaInstance>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Register a saga definition
   */
  registerSaga(definition: SagaDefinition): void {
    this.sagaDefinitions.set(definition.sagaType, definition);
    this.logger.log(`Registered saga: ${definition.sagaType}`);
  }

  /**
   * Start a new saga instance
   */
  async startSaga(
    sagaType: string,
    initialData: Record<string, unknown>,
    traceId?: string,
  ): Promise<SagaInstance> {
    const definition = this.sagaDefinitions.get(sagaType);
    if (!definition) {
      throw new Error(`Saga type ${sagaType} not found`);
    }

    const sagaInstance = this.sagaRepository.create({
      sagaType,
      status: SagaStatus.IN_PROGRESS,
      payload: JSON.stringify(initialData),
      currentStep: 0,
      completedSteps: JSON.stringify([]),
      traceId: traceId || uuidv4(),
    });

    const saved = await this.sagaRepository.save(sagaInstance);

    // Execute saga steps asynchronously
    this.executeSaga(saved.id).catch((error) => {
      this.logger.error(`Saga ${saved.id} execution failed`, error);
    });

    return saved;
  }

  /**
   * Execute saga steps
   */
  private async executeSaga(sagaInstanceId: string): Promise<void> {
    const sagaInstance = await this.sagaRepository.findOneBy({
      id: sagaInstanceId,
    } as any);

    if (!sagaInstance) {
      return;
    }

    const definition = this.sagaDefinitions.get(sagaInstance.sagaType);
    if (!definition) {
      await this.updateSagaStatus(sagaInstanceId, SagaStatus.FAILED, 'Saga definition not found');
      return;
    }

    const data = JSON.parse(sagaInstance.payload);
    const completedSteps = JSON.parse(sagaInstance.completedSteps || '[]') as number[];

    try {
      // Execute each step
      for (const step of definition.steps) {
        if (completedSteps.includes(step.stepNumber)) {
          continue; // Skip already completed steps
        }

        this.logger.log(
          `Executing step ${step.stepNumber} (${step.name}) for saga ${sagaInstanceId}`,
        );

        // Execute step
        const stepResult = await step.execute(data);

        // Update data with step result
        Object.assign(data, stepResult || {});

        // Mark step as completed
        completedSteps.push(step.stepNumber);

        // Update saga instance
        await this.sagaRepository.update(sagaInstanceId, {
          currentStep: step.stepNumber,
          completedSteps: JSON.stringify(completedSteps),
          payload: JSON.stringify(data),
        });
      }

      // All steps completed successfully
      await this.updateSagaStatus(sagaInstanceId, SagaStatus.COMPLETED);
      this.logger.log(`Saga ${sagaInstanceId} completed successfully`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Saga ${sagaInstanceId} failed at step ${sagaInstance.currentStep}`, error);

      // Start compensation
      await this.compensateSaga(sagaInstanceId, definition, errorMessage);
    }
  }

  /**
   * Compensate saga (rollback)
   */
  private async compensateSaga(
    sagaInstanceId: string,
    definition: SagaDefinition,
    errorMessage: string,
  ): Promise<void> {
    const sagaInstance = await this.sagaRepository.findOneBy({
      id: sagaInstanceId,
    } as any);

    if (!sagaInstance) {
      return;
    }

    await this.updateSagaStatus(sagaInstanceId, SagaStatus.COMPENSATING, errorMessage);

    const completedSteps = JSON.parse(sagaInstance.completedSteps || '[]') as number[];
    const data = JSON.parse(sagaInstance.payload);
    const compensationData = sagaInstance.compensationData
      ? JSON.parse(sagaInstance.compensationData)
      : {};

    // Compensate in reverse order
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const stepNumber = completedSteps[i];
      const step = definition.steps.find((s) => s.stepNumber === stepNumber);

      if (step && step.compensate) {
        try {
          this.logger.log(
            `Compensating step ${stepNumber} (${step.name}) for saga ${sagaInstanceId}`,
          );
          await step.compensate(data, compensationData);
        } catch (compError) {
          this.logger.error(
            `Compensation failed for step ${stepNumber} in saga ${sagaInstanceId}`,
            compError,
          );
          // Continue with other compensations even if one fails
        }
      }
    }

    await this.updateSagaStatus(sagaInstanceId, SagaStatus.COMPENSATED);
    this.logger.log(`Saga ${sagaInstanceId} compensated`);
  }

  /**
   * Update saga status
   */
  private async updateSagaStatus(
    sagaInstanceId: string,
    status: SagaStatus,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: Partial<SagaInstance> = { status };
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }
    await this.sagaRepository.update(sagaInstanceId, updateData);
  }

  /**
   * Get saga instance by ID
   */
  async getSagaInstance(sagaInstanceId: string): Promise<SagaInstance | null> {
    return this.sagaRepository.findOneBy({ id: sagaInstanceId } as any);
  }
}

