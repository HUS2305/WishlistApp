import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prismaService: PrismaService,
  ) {}

  // Public health check - minimal info for load balancers/monitoring
  @Get()
  async checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  // Protected database check - only for authenticated admins
  @Get('database')
  @UseGuards(AuthGuard, AdminGuard)
  async testDatabase() {
    try {
      const userCount = await this.prismaService.user.count();
      return {
        status: 'success',
        connection: 'healthy',
        userCount,
        message: 'Database connection working!',
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

