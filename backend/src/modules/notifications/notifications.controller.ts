import { Controller, Get, UseGuards } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { NotificationsService } from './notifications.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Controller('notifications')
@UseGuards(JwtAccessGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(
    @CurrentUser('id') userId: string,
  ) {
    const notifications = await this.notificationsService.getByUser(userId, 20);
    return notifications.map((notif) =>
      plainToInstance(NotificationResponseDto, notif, {
        excludeExtraneousValues: true,
      }),
    );
  }
}
