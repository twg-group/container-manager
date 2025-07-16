import { Expose } from 'class-transformer';
import { IsDateString, IsString } from 'class-validator';

export class LogDto {
  @Expose()
  @IsDateString()
  timestamp: string;

  @Expose()
  @IsString()
  message: string;

  @Expose()
  @IsString()
  stream?: string;
}
