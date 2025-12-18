import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  async checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: this.prismaService.isConnected() ? 'connected' : 'disconnected',
      provider: 'Neon PostgreSQL',
    };
  }

  @Get('database')
  async testDatabase() {
    try {
      const userCount = await this.prismaService.user.count();
      return {
        status: 'success',
        connection: 'Neon PostgreSQL',
        userCount,
        message: 'Database connection working!',
      };
    } catch (error) {
      return {
        status: 'error',
        connection: 'Neon PostgreSQL',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: String(error),
      };
    }
  }
}

