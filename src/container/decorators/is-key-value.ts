import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsKeyValue(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isKeyValue',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: { [s: string]: unknown } | ArrayLike<unknown>) {
          if (typeof value !== 'object') return false;
          return Object.values(value).every((v) => typeof v === 'string');
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an object with string values`;
        },
      },
    });
  };
}
