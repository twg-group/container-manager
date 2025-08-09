import * as colors from '@nestjs/common/utils/cli-colors.util';

const colorsBright = {
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  redBright: (text: string) => `\x1b[91m${text}\x1b[0m`,
  greenBright: (text: string) => `\x1b[92m${text}\x1b[0m`,
  yellowBright: (text: string) => `\x1b[93m${text}\x1b[0m`,
  blueBright: (text: string) => `\x1b[94m${text}\x1b[0m`,
  magentaBright: (text: string) => `\x1b[95m${text}\x1b[0m`,
  cyanBright: (text: string) => `\x1b[96m${text}\x1b[0m`,
  whiteBright: (text: string) => `\x1b[97m${text}\x1b[0m`,
};

export const clc = { ...colors.clc, ...colorsBright };
