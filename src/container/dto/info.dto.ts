import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsISO8601,
  ArrayNotEmpty,
} from 'class-validator';

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
}
