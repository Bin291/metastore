import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities';
import { NotificationsGateway } from './notifications.gateway';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createAndDispatch(input: CreateNotificationInput): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: input.userId,
      type: input.type,
      payload: input.payload,
    });

    const saved = await this.notificationRepository.save(notification);

    this.notificationsGateway.emitToUser(input.userId, 'notification', {
      id: saved.id,
      type: saved.type,
      payload: saved.payload,
      createdAt: saved.createdAt,
    });

    return saved;
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOneOrFail({
      where: { id: notificationId, userId },
    });

    notification.readAt = new Date();
    return this.notificationRepository.save(notification);
  }
}

