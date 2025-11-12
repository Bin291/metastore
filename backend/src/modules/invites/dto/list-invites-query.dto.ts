import { Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { InviteStatus } from '../../../common/enums/invite-status.enum';

export class ListInvitesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => String)
  @IsEnum(InviteStatus)
  status?: InviteStatus;
}

