import { IsOptional, IsString, IsISO8601, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class KeyValuePair {
  [key: string]: string;
}

function transformArrays(value: unknown): KeyValuePair[] {
  if (!value) return [];
  const entries = Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : typeof value === 'string'
      ? [value]
      : [];
  return entries
    .map((entry) => {
      const match = entry.match(/^\[([^,\[\]]+),\s*([^,\[\]]+)]$/);
      if (!match) {
        return null;
      }
      const key = match[1].trim();
      const val = match[2].trim();
      return key && val ? { [key]: val } : null;
    })
    .filter(Boolean) as KeyValuePair[];
}

export class ListFilterDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ports?: string[];

  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @IsOptional()
  @Transform(({ value }) => transformArrays(value as string))
  labels?: KeyValuePair[];

  @IsOptional()
  @Transform(({ value }) => transformArrays(value as string))
  env?: KeyValuePair[];
}
