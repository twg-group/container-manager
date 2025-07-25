import { Expose } from 'class-transformer';
import { IsOptional, IsPort, IsString } from 'class-validator';

export class PortBindingDto {
  @Expose()
  @IsOptional()
  @IsPort()
  hostPort?: string;

  @Expose()
  @IsOptional()
  @IsPort()
  containerPort?: string;

  @Expose()
  @IsOptional()
  @IsString()
  protocol?: string = 'tcp';
}
