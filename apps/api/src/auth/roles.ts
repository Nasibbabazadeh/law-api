import {
  applyDecorators,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import { UserRoleSchema, type UserRole } from '@huquq/core';
import { ApiException } from '../common/api-exception.js';
import type { AuthedRequest } from './current-user.decorator.js';

export const ROLES_KEY = 'huquq:roles';

/**
 * Checks the signed-in user's product role (student | teacher). Runs after the global
 * Better Auth guard, which has already rejected anonymous requests.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const role = UserRoleSchema.safeParse(request.user?.role);
    if (!role.success || !roles.includes(role.data)) {
      throw ApiException.forbidden();
    }
    return true;
  }
}

/** Restrict a route or controller to the given roles, e.g. `@Roles('teacher')`. */
export const Roles = (...roles: [UserRole, ...UserRole[]]): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(RolesGuard),
    ApiForbiddenResponse({ description: `Requires role: ${roles.join(' | ')}` }),
  );
