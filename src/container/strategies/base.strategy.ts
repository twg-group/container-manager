import { HttpException } from '@nestjs/common';
import { DeployConfigDto, InfoDto, LogDto, PortBindingDto } from '@dto';
import { Logger } from '@twg-group/nestjs-logger';

export abstract class BaseStrategy {
  /**
   * @param logger
   */
  constructor(protected readonly logger: Logger) {}

  /**
   * Starts a stopped container/service
   * @param id Container/service identifier
   * @returns Promise that resolves when the container is started
   */
  abstract start(id: string): Promise<void>;

  /**
   * Stops a running container/service
   * @param id Container/service identifier
   * @param timeout Timeout in seconds before killing the container
   * @returns Promise that resolves when the container is stopped
   */
  abstract stop(id: string, timeout?: number): Promise<void>;

  /**
   * Deploys container/service using validated config
   * @param config Validated deployment config
   * @returns Created container/service ID
   */
  abstract deploy(config: DeployConfigDto): Promise<string>;

  /**
   * Lists all managed containers/services
   * @returns Array of container/service info
   */
  abstract list(): Promise<InfoDto[]>;

  /**
   * Removes specific container/service
   * @param id Container/service identifier
   */
  abstract remove(id: string): Promise<void>;

  /**
   * Retrieves logs for specific container/service
   * @param id Container/service identifier
   * @param since Filter logs since timestamp
   * @param tail Number of log lines to return
   */
  abstract logs(id: string, since?: string, tail?: number): Promise<LogDto[]>;

  /**
   * Validates deployment config (extends default DTO validation)
   * @param config Configuration to validate
   * @throws Error if validation fails
   */
  protected validateConfig(config: DeployConfigDto): void {
    if (config.ports) {
      this.validatePortUniqueness(config.ports);
    }
  }

  /**
   * Ensures all host ports are unique
   * @param ports Array of port bindings
   */
  private validatePortUniqueness(ports: PortBindingDto[]): void {
    const hostPorts = ports.map((p) => p.hostPort);
    if (new Set(hostPorts).size !== hostPorts.length) {
      throw new Error('Duplicate host ports detected');
    }
  }

  /**
   * Generates default resource name
   * @param prefix Naming prefix (e.g. "container")
   * @returns Generated name (e.g. "container-abc123")
   */
  protected generateName(prefix = 'container'): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Standard error handler
   * @param error Caught error
   * @param context Additional error context
   * @throws Formatted error
   */
  protected handleError(
    error: { message?: string; statusCode?: number },
    context = '',
  ): never {
    const message = error.message || 'Unknown error occurred';
    const statusCode = error.statusCode ?? 500;
    this.logger.error(error);
    throw new HttpException(
      { message, context: context || undefined, statusCode },
      statusCode,
    );
  }
}
