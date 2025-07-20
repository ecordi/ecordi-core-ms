import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AccessControlService } from '../access-control.service';

/**
 * Interceptor para verificar permisos de acceso en las llamadas a microservicios
 */
@Injectable()
export class AccessControlInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AccessControlInterceptor');

  constructor(private readonly accessControlService: AccessControlService) {}

  /**
   * Intercepta la llamada y verifica los permisos de acceso
   * @param context Contexto de ejecución
   * @param next Manejador para continuar con la ejecución
   * @returns Observable del resultado
   */
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const rpcContext = context.switchToRpc();
    const data = rpcContext.getData();
    
    // Verificar si hay datos de autenticación y control de acceso
    if (!data || !data.auth) {
      return next.handle();
    }

    try {
      const { token, resource, action, companyId } = data.auth;

      if (!token) {
        throw new UnauthorizedException('Token de autorización no proporcionado');
      }

      if (!resource || !action || !companyId) {
        throw new ForbiddenException('Datos de control de acceso incompletos');
      }

      // Verificar acceso
      const accessResult = await this.accessControlService.checkAccess({
        token,
        resource,
        action,
        companyId,
        userId: undefined, // Opcional, se obtendrá del token
      });

      if (!accessResult.hasAccess) {
        this.logger.warn(`Acceso denegado: ${resource}:${action} para compañía ${companyId}`);
        throw new ForbiddenException('No tiene permisos para realizar esta acción');
      }

      // Agregar información del usuario al contexto para uso posterior
      data.user = {
        userId: accessResult.userId,
        companyId,
      };

      return next.handle();
    } catch (error) {
      this.logger.error(`Error en interceptor de control de acceso: ${error.message}`, error.stack);
      
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new UnauthorizedException('Error al verificar permisos de acceso');
    }
  }
}
