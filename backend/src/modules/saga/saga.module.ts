import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SagaInstance } from '../../entities/saga-instance.entity';
import { SagaOrchestratorService } from './saga-orchestrator.service';

@Module({
  imports: [TypeOrmModule.forFeature([SagaInstance])],
  providers: [SagaOrchestratorService],
  exports: [SagaOrchestratorService],
})
export class SagaModule {}

