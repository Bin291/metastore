import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UsersService } from './users.service';

@Injectable()
export class UsersInitializer implements OnModuleInit {
  private readonly logger = new Logger(UsersInitializer.name);

  constructor(private readonly usersService: UsersService) {}

  async onModuleInit(): Promise<void> {
    const initialized = await this.usersService.ensureDefaultAdmin();
    if (initialized.created) {
      this.logger.log(
        `Default admin user ensured with username "${initialized.username}".`,
      );
    }
  }
}

