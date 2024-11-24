import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AdminGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext) {
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      throw new ForbiddenException('Not authorized to access this resource');
    }

    const request = context.switchToHttp().getRequest();
    if (!request.user?.isAdmin) {
      throw new ForbiddenException('Not an Admin! User not authorized');
    }

    return true;
  }
}
