import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ContainerController } from './container.controller';
import { ContainerService } from './container.service';
import { DeployConfigDto, InfoDto, LogDto, ListFilterDto } from '@dto';

describe('ContainerController', () => {
  let controller: ContainerController;
  let containerService: jest.Mocked<ContainerService>;

  // Mock данные
  const mockContainerInfo: InfoDto = {
    id: 'abc123',
    name: 'test-container',
    image: 'nginx:latest',
    status: 'running',
    ports: ['80/tcp'],
    createdAt: new Date().toISOString(),
    labels: { 'com.example.key': 'value' },
    env: { ENV_VAR: 'value' },
  };

  const mockLogEntry: LogDto = {
    timestamp: new Date().toISOString(),
    message: 'log message',
    stream: 'stdout',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContainerController],
      providers: [
        {
          provide: ContainerService,
          useValue: {
            start: jest.fn().mockResolvedValue(undefined),
            stop: jest.fn().mockResolvedValue(undefined),
            deploy: jest.fn().mockResolvedValue('new-container-id'),
            list: jest.fn().mockResolvedValue([mockContainerInfo]),
            getById: jest.fn().mockResolvedValue(mockContainerInfo),
            logs: jest.fn().mockResolvedValue([mockLogEntry]),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<ContainerController>(ContainerController);
    containerService = module.get(ContainerService);
  });

  describe('POST /containers/:id/start', () => {
    it('should start container', async () => {
      await expect(controller.start('abc123')).resolves.toEqual({
        status: 'started',
      });
      expect(containerService.start).toHaveBeenCalledWith('abc123');
    });

    it('should handle errors', async () => {
      containerService.start.mockRejectedValueOnce(new Error('Start failed'));
      await expect(controller.start('abc123')).rejects.toThrow('Start failed');
    });
  });

  describe('POST /containers/:id/stop', () => {
    it('should stop container with default timeout', async () => {
      await expect(controller.stop('abc123')).resolves.toEqual({
        status: 'stopped',
      });
      expect(containerService.stop).toHaveBeenCalledWith('abc123', undefined);
    });

    it('should stop container with custom timeout', async () => {
      await expect(controller.stop('abc123', 30)).resolves.toEqual({
        status: 'stopped',
      });
      expect(containerService.stop).toHaveBeenCalledWith('abc123', 30);
    });
  });

  describe('POST /containers', () => {
    const deployConfig: DeployConfigDto = {
      image: 'nginx:latest',
      ports: [{ hostPort: 8080, containerPort: 80 }],
    };

    it('should deploy container', async () => {
      await expect(controller.deploy(deployConfig)).resolves.toEqual({
        id: 'new-container-id',
      });
      expect(containerService.deploy).toHaveBeenCalledWith(deployConfig);
    });

    it('should return 201 status code', () => {
      const metadata = Reflect.getMetadata('__httpCode__', controller.deploy);
      expect(metadata).toBe(HttpStatus.CREATED);
    });
  });

  describe('GET /containers', () => {
    it('should return filtered containers', async () => {
      const filter: ListFilterDto = { status: 'running' };
      await expect(controller.list(filter)).resolves.toEqual({
        containers: [mockContainerInfo],
      });
      expect(containerService.list).toHaveBeenCalledWith(filter);
    });

    it('should return all containers when no filter', async () => {
      await expect(controller.list({})).resolves.toEqual({
        containers: [mockContainerInfo],
      });
    });
  });

  describe('GET /containers/:id', () => {
    it('should return container by id', async () => {
      await expect(controller.byId('abc123')).resolves.toEqual(
        mockContainerInfo,
      );
      expect(containerService.getById).toHaveBeenCalledWith('abc123');
    });

    it('should return undefined for non-existent container', async () => {
      containerService.getById.mockResolvedValueOnce(undefined);
      await expect(controller.byId('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('GET /containers/:id/logs', () => {
    it('should return logs with default params', async () => {
      await expect(controller.logs('abc123')).resolves.toEqual({
        logs: [mockLogEntry],
      });
      expect(containerService.logs).toHaveBeenCalledWith(
        'abc123',
        undefined,
        undefined,
      );
    });

    it('should return logs with custom params', async () => {
      const since = '2023-01-01';
      const tail = 100;
      await expect(controller.logs('abc123', since, tail)).resolves.toEqual({
        logs: [mockLogEntry],
      });
      expect(containerService.logs).toHaveBeenCalledWith('abc123', since, tail);
    });
  });

  describe('DELETE /containers/:id', () => {
    it('should remove container', async () => {
      await expect(controller.remove('abc123')).resolves.toBeUndefined();
      expect(containerService.remove).toHaveBeenCalledWith('abc123');
    });

    it('should return 204 status code', () => {
      const metadata = Reflect.getMetadata('__httpCode__', controller.remove);
      expect(metadata).toBe(HttpStatus.NO_CONTENT);
    });
  });
});
