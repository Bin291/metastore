import { Expose } from 'class-transformer';

export class NotificationResponseDto {
  @Expose()
  id: string;

  @Expose()
  type: string;

  @Expose()
  message: string;

  @Expose()
  payload?: Record<string, unknown> | null;

  @Expose()
  readAt?: Date | null;

  @Expose()
  createdAt: Date;
}
