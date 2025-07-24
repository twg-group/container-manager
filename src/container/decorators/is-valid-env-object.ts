import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsValidEnvObject(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidEnvObject',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: { [s: string]: unknown } | ArrayLike<unknown>) {
          if (!value) return true;
          if (typeof value !== 'object') return false;
          return Object.entries(value).every(([key, val]) => {
            return /^[A-Z_][A-Z0-9_]*$/.test(key) && typeof val === 'string';
          });
        },
        defaultMessage() {
          return 'Env keys must be UPPER_CASE with underscores, and values must be strings';
        },
      },
    });
  };
}
