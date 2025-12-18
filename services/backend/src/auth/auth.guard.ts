import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';

@Injectable()
export class AuthGuard implements CanActivate {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.CLERK_SECRET_KEY || '';
    if (!this.secretKey) {
      console.warn('⚠️ CLERK_SECRET_KEY not set - authentication will fail');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract token from Authorization header
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      // 🔒 SECURITY: Explicit dev mode bypass (requires ENABLE_DEV_MODE=true AND NODE_ENV=production is FALSE)
      if (process.env.ENABLE_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ DEV MODE BYPASS: Allowing request without auth token');
        request.userId = 'test-user-id';
        return true;
      }
      throw new UnauthorizedException('No authorization token provided');
    }

    try {
      // Verify the token with Clerk - verifyToken is a standalone function
      // In Clerk v1.34.0, verifyToken reads CLERK_SECRET_KEY from env or accepts options
      const session = await verifyToken(token, {
        secretKey: this.secretKey,
      });
      
      // Extract user ID from the verified session (sub is the user ID)
      request.userId = session.sub; // Clerk user ID
      
      // Only log authentication in debug mode to reduce terminal noise
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH === 'true') {
        console.log('✅ Authenticated user:', request.userId);
      }
      return true;
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      
      // 🔒 SECURITY: NO fallback in ANY circumstance - always fail if token is invalid
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}

