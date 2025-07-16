import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class VolumeBindingDto {
  @Expose()
  @IsString()
  hostPath: string;

  @Expose()
  @IsString()
  containerPath: string;

  @Expose()
  @IsOptional()
  @IsString()
  mode?: string = 'rw';
}
