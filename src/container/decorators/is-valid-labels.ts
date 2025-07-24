import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsValidLabels(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidLabels',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: { [s: string]: unknown } | ArrayLike<unknown>) {
          if (value === undefined || value === null) return true; // Пропускаем отсутствующие метки
          if (typeof value !== 'object') return false;
          return Object.entries(value).every(([key, val]) => {
            return /^[a-z0-9-_.]+$/.test(key) && typeof val === 'string';
          });
        },
        defaultMessage() {
          return 'Labels must be an object with keys containing only a-z, 0-9, -, _, . and string values';
        },
      },
    });
  };
}
