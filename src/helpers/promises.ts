import { LoggerService } from '@nestjs/common';

export const sleep = async (ms: number) => {
  return new Promise((resolve) =>
    setTimeout(() => {
      return resolve(ms);
    }, ms),
  );
};

export const warpSettled = async (
  result: Promise<PromiseSettledResult<any>[]>,
  logger?: LoggerService,
  context?: string,
): Promise<boolean> => {
  return result.then((results) => {
    const rejected = results.filter((result) => result.status === 'rejected');
    if (rejected.length === 0) {
      return true;
    }
    logger?.error(`Not all promises are fulfilled - Done!`, context);
    logger?.error(
      rejected.map((item: PromiseRejectedResult) => item.reason),
      context,
    );
    return false;
  });
};
