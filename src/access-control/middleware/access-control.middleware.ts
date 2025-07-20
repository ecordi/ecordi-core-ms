import { Injectable, NestMiddleware, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AccessControlService } from '../access-control.service';

/**
 * Middleware para verificar permisos de acceso en las solicitudes entrantes
 */
@Injectable()
export class AccessControlMiddleware implements NestMiddleware {
  private readonly logger = new Logger('AccessControlMiddleware');

  constructor(private readonly accessControlService: AccessControlService) {}

  /**
   * Procesa la solicitud y verifica los permisos de acceso
   * @param req Solicitud
   * @param res Respuesta
   * @param next Función para continuar con el siguiente middleware
   */
  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extraer token de autorización
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('Token de autorización no proporcionado');
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException('Token de autorización inválido');
      }

      // Extraer información de la ruta y método para determinar el recurso y acción
      const path = req.path;
      const method = req.method;

      // Mapear método HTTP a acción
      const actionMap = {
        GET: 'read',
        POST: 'create',
        PUT: 'update',
        PATCH: 'update',
        DELETE: 'delete',
      };

      // Determinar recurso basado en la ruta
      // Ejemplo: /api/users -> recurso: users
      const resource = path.split('/').filter(Boolean)[1] || 'default';
      const action = actionMap[method] || 'read';

      // Extraer companyId del header o query param
      const companyId = req.headers['x-company-id'] as string || req.query.companyId as string;
      
      if (!companyId) {
        throw new ForbiddenException('ID de compañía no proporcionado');
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

      // Agregar información del usuario al request para uso posterior
      req['user'] = {
        userId: accessResult.userId,
        companyId,
      };

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Error en middleware de control de acceso: ${error.message}`, error.stack);
      throw new UnauthorizedException('Error al verificar permisos de acceso');
    }
  }
}
