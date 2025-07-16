import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  IsInt,
  Min,
  Max,
  validateSync,
  IsBoolean,
  Matches,
} from 'class-validator';
import { PortBindingDto } from './port-binding.dto';
import { VolumeBindingDto } from './volume-binding.dto';
import { plainToClass } from 'class-transformer';

export class DeployConfigDto {
  @IsNotEmpty({ message: 'Image must be specified' })
  @IsString()
  readonly image: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-_]+$/, {
    message:
      'Name can only contain lowercase letters, numbers, hyphens and underscores',
  })
  readonly name?: string;

  @IsOptional()
  @IsObject()
  readonly env?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortBindingDto)
  readonly ports?: PortBindingDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VolumeBindingDto)
  readonly volumes?: VolumeBindingDto[];

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Minimum 1 replica required' })
  @Max(20, { message: 'Maximum 20 replicas allowed' })
  readonly replicas?: number = 1;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-_]+$/, {
    message:
      'Network name can only contain lowercase letters, numbers, hyphens and underscores',
  })
  readonly network?: string;

  @IsOptional()
  @IsObject()
  readonly labels?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  readonly restartPolicy?: boolean = true;

  static create(config: Partial<DeployConfigDto>): DeployConfigDto {
    const instance = plainToClass(DeployConfigDto, config, {
      enableImplicitConversion: true,
    });
    const errors = validateSync(instance);
    if (errors.length > 0) {
      const errorMessages = errors.flatMap((e) =>
        Object.values(e.constraints ?? {}),
      );
      throw new Error(`Configuration error: ${errorMessages.join('; ')}`);
    }
    return instance;
  }

  validate(): void {
    const errors = validateSync(this);
    if (errors.length > 0) {
      const message = errors
        .map(
          (e) =>
            `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
        )
        .join(' | ');
      throw new Error(`Validation failed: ${message}`);
    }
  }
}
