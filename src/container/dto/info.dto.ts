import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsISO8601,
  ArrayNotEmpty,
  IsOptional,
  IsObject,
} from 'class-validator';
import { IsValidLabels } from '../decorators/is-valid-labels';
import { IsValidEnvObject } from '../decorators/is-valid-env-object';

export class InfoDto {
  @IsString()
  @IsNotEmpty()
  public readonly id: string;

  @IsString()
  @IsNotEmpty()
  public readonly name: string;

  @IsString()
  @IsNotEmpty()
  public readonly image: string;

  @IsString()
  @IsNotEmpty()
  public readonly status: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  public readonly ports: string[];

  @IsISO8601()
  @IsNotEmpty()
  public readonly createdAt: string;

  @IsOptional()
  @IsObject()
  @IsValidLabels()
  public readonly labels?: Record<string, string>;

  @IsOptional()
  @IsValidEnvObject()
  public readonly env?: Record<string, string>;
}
