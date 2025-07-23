import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ContainerService } from './container.service';
import { DeployConfigDto, InfoDto, LogDto } from '@dto';
import { ListFilterDto } from '@dto/list-filter.dto';

@Controller('containers')
export class ContainerController {
  constructor(private readonly containerService: ContainerService) {}

  @Post(':id/start')
  async start(@Param('id') id: string): Promise<{ status: string }> {
    await this.containerService.start(id);
    return { status: 'started' };
  }

  @Post(':id/stop')
  async stop(
    @Param('id') id: string,
    @Query('timeout') timeout?: number,
  ): Promise<{ status: string }> {
    await this.containerService.stop(id, timeout);
    return { status: 'stopped' };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async deploy(@Body() config: DeployConfigDto): Promise<{ id: string }> {
    const id = await this.containerService.deploy(config);
    return { id };
  }

  @Get()
  async list(
    @Query() filter: ListFilterDto,
  ): Promise<{ containers: InfoDto[] }> {
    const containers = await this.containerService.list(filter);
    return { containers };
  }

  @Get(':id')
  async byId(@Param('id') id: string): Promise<InfoDto | undefined> {
    return this.containerService.getById(id);
  }

  @Get(':id/logs')
  async logs(
    @Param('id') id: string,
    @Query('since') since?: string,
    @Query('tail') tail?: number,
  ): Promise<{ logs: LogDto[] }> {
    const logs = await this.containerService.logs(id, since, tail);
    return { logs };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.containerService.remove(id);
  }
}
