export const toBoolean = (str: string | unknown): boolean =>
  str !== undefined && str !== 'false' && str !== '0' && str !== '';

export const ucfirst = (string: string): string =>
  string[0].toUpperCase() + string.slice(1);

export const lcfirst = (string: string): string =>
  string[0].toLowerCase() + string.slice(1);

export const toKebabCase = (string: string): string =>
  lcfirst(string)
    .replace(/\/[A-Z]/g, (str) => `${str.toLowerCase()}`)
    .replace(/[A-Z]/g, (str) => `-${str}`)
    .toLowerCase();

export const splitWithSpaces = (string: string): string =>
  string.replace(/[A-Z]/g, (str) => ` ${str}`);
