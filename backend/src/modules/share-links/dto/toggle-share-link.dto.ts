import { IsBoolean } from 'class-validator';

export class ToggleShareLinkDto {
  @IsBoolean()
  active: boolean;
}

