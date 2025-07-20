import { Controller, Logger, Post, Body, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CustomException } from '../common/exceptions/custom-exceptions';
import { CompanyService } from './company.service';
import { Company } from './schemas/company.schema';
import { CreateCompanyWithAdminDto } from './dto/create-company-with-admin.dto';

@Controller()
export class CompanyController {
  private readonly logger = new Logger('CompanyController');

  constructor(private readonly companyService: CompanyService) {}

  /**
   * Crea una nueva compañía
   * @param payload Datos de la compañía
   * @returns Compañía creada
   */
  // Endpoint HTTP
  // @Post()
  // async create(@Body() payload: {
  //   name: string;
  //   taxId: string;
  //   description?: string;
  //   address?: string;
  //   phone?: string;
  //   email?: string;
  //   website?: string;
  // }): Promise<Company> {
  //   this.logger.debug(`Creando compañía: ${JSON.stringify(payload)}`);
  //   return this.companyService.create(payload);
  // }

  /**
   * Actualiza una compañía existente
   * @param payload Datos a actualizar
   * @returns Compañía actualizada
   */
  @MessagePattern('core.company.update')
  async update(@Payload() payload: {
    id: string;
    data: Partial<Company>;
  }): Promise<Company> {
    this.logger.debug(`Actualizando compañía ${payload.id}`);
    return this.companyService.update(payload.id, payload.data);
  }

  /**
   * Busca una compañía por su ID
   * @param payload ID de la compañía
   * @returns Compañía encontrada
   */
  @MessagePattern('core.companies.findById')
  async findById(@Payload() payload: { id: string }): Promise<Company> {
    return this.companyService.findById(payload.id);
  }

  /**
   * Busca una compañía por su taxId
   * @param payload taxId de la compañía
   * @returns Compañía encontrada
   */
  @MessagePattern('core.company.findByTaxId')
  async findByTaxId(@Payload() payload: { taxId: string }): Promise<Company> {
    return this.companyService.findByTaxId(payload.taxId);
  }

  /**
   * Obtiene todas las compañías activas
   * @param payload Datos de la solicitud con userId
   * @returns Lista de compañías
   */
  @MessagePattern('core.companies.findAll')
  async findAll(@Payload() payload: { userId: string }): Promise<Company[]> {
    this.logger.debug(`Buscando todas las compañías para el usuario: ${payload.userId}`);
    return this.companyService.findAll();
  }

  /**
   * Desactiva una compañía
   * @param payload ID de la compañía
   * @returns true si se desactivó correctamente
   */
  @MessagePattern('core.company.deactivate')
  async deactivate(@Payload() payload: { id: string }): Promise<boolean> {
    this.logger.debug(`Desactivando compañía ${payload.id}`);
    return this.companyService.deactivate(payload.id);
  }

  /**
   * Crea una nueva compañía con un usuario administrador
   * @param dto Datos de la compañía y del administrador
   * @returns Compañía creada y respuesta del registro de usuario
   */
  @Post('/with-admin')
  async createWithAdmin(@Body() dto: CreateCompanyWithAdminDto) {
    try {
      this.logger.debug(`Creando compañía con administrador: ${JSON.stringify(dto)}`);
      return await this.companyService.create(dto);
    } catch (error) {
      this.logger.error(`Error al crear compañía: ${error.message}`, error.stack);
      throw new RpcException({
        message: error.message,
        status: error.status || 500,
        error: error.name || 'Internal Server Error'
      });
    }
  }

  /**
   * Crea una nueva compañía con un usuario administrador (vía NATS)
   * @param payload Datos de la compañía y del administrador
   * @returns Compañía creada y respuesta del registro de usuario
   */
  @MessagePattern('core.companies.create')
  async create(@Payload() payload: CreateCompanyWithAdminDto) {
    try {
      this.logger.debug(`Creando compañía con administrador vía NATS: ${JSON.stringify(payload)}`);
      return await this.companyService.create(payload);
    } catch (error) {
      this.logger.error(`Error al crear compañía vía NATS: ${error.message}`, error.stack);
      throw this.handleError(error);
    }
  }

  private handleError(error: any): RpcException {
    // Si el error ya es un RpcException, lo devolvemos tal cual
    if (error instanceof RpcException) {
      return error;
    }

    // Si es una excepción personalizada con formato { error: { ... } }
    if (error?.error) {
      return new RpcException(error.error);
    }

    // Para cualquier otro tipo de error
    return new RpcException({
      message: error?.message || 'Error interno del servidor',
      status: 500,
      error: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}
