import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsPort, IsString, Min } from 'class-validator';

export class PortBindingDto {
  @Expose()
  @IsInt()
  @Min(1)
  hostPort: number;

  @Expose()
  @IsPort()
  containerPort: number;

  @Expose()
  @IsOptional()
  @IsString()
  protocol?: string = 'tcp';
}
