import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clerkUserId = request.userId; // This is the Clerk ID from AuthGuard

    if (!clerkUserId) {
      throw new ForbiddenException('Authentication required');
    }

    // 🔒 SECURITY FIX: Look up user by clerkId (NOT database id)
    // AuthGuard provides Clerk ID, not database UUID
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}

