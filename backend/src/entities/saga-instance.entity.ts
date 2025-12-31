import {
  Column,
  Entity,
  Index,
} from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { SagaStatus } from '../common/enums/saga-status.enum';

@Entity({ name: 'saga_instances' })
@Index('idx_saga_instances_status', ['status'])
@Index('idx_saga_instances_type', ['sagaType'])
export class SagaInstance extends BaseEntity {
  @Column({ name: 'saga_type', type: 'varchar', length: 255 })
  sagaType: string;

  @Column({
    type: 'text',
    default: SagaStatus.PENDING,
  })
  status: SagaStatus;

  @Column({ type: 'text' })
  payload: string; // JSON string - initial saga data

  @Column({ name: 'current_step', type: 'int', default: 0 })
  currentStep: number;

  @Column({ name: 'completed_steps', type: 'text', nullable: true })
  completedSteps?: string | null; // JSON array of step numbers

  @Column({ name: 'compensation_data', type: 'text', nullable: true })
  compensationData?: string | null; // JSON - data needed for compensation

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'trace_id', type: 'varchar', length: 255, nullable: true })
  traceId?: string | null;
}

