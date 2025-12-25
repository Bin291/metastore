import { IsNotEmpty, IsString } from 'class-validator';

export class UploadAvatarDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  contentType: string;

  @IsNotEmpty()
  fileSize: number;
}

