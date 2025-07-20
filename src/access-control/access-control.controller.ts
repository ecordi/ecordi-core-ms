import { Controller, Logger, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AccessControlService } from './access-control.service';
import { CheckAccessDto } from './dto/check-access.dto';
import { ResolveUserContextDto } from './dto/resolve-user-context.dto';
import { ResolveModulesDto } from './dto/resolve-modules.dto';
import { CheckAccessResponseDto } from './dto/check-access-response.dto';
import { UserContextResponseDto } from './dto/user-context-response.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@Controller('access-control')
@ApiTags('Access Control')
export class AccessControlController {
  private readonly logger = new Logger('AccessControlController');

  constructor(private readonly accessControlService: AccessControlService) {}

  /**
   * Resuelve el contexto completo del usuario
   * @param payload Datos para resolver el contexto
   * @returns Contexto completo del usuario
   */
  @MessagePattern('core.resolve.userContext')
  async resolveUserContext(
    @Payload() payload: ResolveUserContextDto,
  ): Promise<UserContextResponseDto> {
    this.logger.debug(`Resolviendo contexto de usuario: ${JSON.stringify(payload)}`);
    return this.accessControlService.resolveUserContext(payload);
  }

  /**
   * Endpoint HTTP para resolver el contexto del usuario (documentación Swagger)
   */
  @Post('resolve-context')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolver contexto de usuario', description: 'Obtiene el contexto completo del usuario incluyendo permisos y roles' })
  @ApiBody({ type: ResolveUserContextDto })
  @ApiResponse({ status: 200, description: 'Contexto de usuario resuelto correctamente', type: UserContextResponseDto })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async resolveUserContextHttp(
    @Body() payload: ResolveUserContextDto,
  ): Promise<UserContextResponseDto> {
    return this.accessControlService.resolveUserContext(payload);
  }

  /**
   * Verifica si un usuario tiene acceso a un recurso y acción específicos
   * @param payload Datos para verificar el acceso
   * @returns Resultado de la verificación
   */
  @MessagePattern('core.check.access')
  async checkAccess(
    @Payload() payload: CheckAccessDto,
  ): Promise<CheckAccessResponseDto> {
    this.logger.debug(`Verificando acceso: ${JSON.stringify(payload)}`);
    return this.accessControlService.checkAccess(payload);
  }

  /**
   * Endpoint HTTP para verificar acceso (documentación Swagger)
   */
  @Post('check-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar acceso', description: 'Verifica si un usuario tiene acceso a un recurso y acción específicos' })
  @ApiBody({ type: CheckAccessDto })
  @ApiResponse({ status: 200, description: 'Verificación de acceso completada', type: CheckAccessResponseDto })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async checkAccessHttp(
    @Body() payload: CheckAccessDto,
  ): Promise<CheckAccessResponseDto> {
    return this.accessControlService.checkAccess(payload);
  }

  /**
   * Resuelve los módulos visibles para un usuario en una compañía
   * @param payload Datos para resolver los módulos
   * @returns Mapa de módulos con sus permisos
   */
  @MessagePattern('core.resolve.modules')
  async resolveModules(
    @Payload() payload: ResolveModulesDto,
  ): Promise<Record<string, any>> {
    this.logger.debug(`Resolviendo módulos: ${JSON.stringify(payload)}`);
    return this.accessControlService.resolveModules(payload);
  }

  /**
   * Endpoint HTTP para resolver módulos (documentación Swagger)
   */
  @Post('resolve-modules')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolver módulos', description: 'Obtiene los módulos visibles para un usuario en una compañía' })
  @ApiBody({ type: ResolveModulesDto })
  @ApiResponse({ status: 200, description: 'Módulos resueltos correctamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async resolveModulesHttp(
    @Body() payload: ResolveModulesDto,
  ): Promise<Record<string, any>> {
    return this.accessControlService.resolveModules(payload);
  }
}
