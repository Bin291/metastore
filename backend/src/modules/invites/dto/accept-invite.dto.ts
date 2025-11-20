import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class AcceptInviteDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  userFullName: string;

  @IsNotEmpty()
  @IsString()
  @Length(1, 20)
  userPhone: string;
}
