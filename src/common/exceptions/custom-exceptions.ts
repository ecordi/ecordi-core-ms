import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

/**
 * Clase base para excepciones personalizadas
 */
export class CustomException extends RpcException {
  constructor(message: string, status: HttpStatus, code?: string) {
    super({
      error: {
        message,
        status,
        error: HttpStatus[status],
        code: code || HttpStatus[status]
      }
    });
  }
}

/**
 * Excepción para recursos duplicados (por ejemplo, taxId duplicado)
 */
export class DuplicateResourceException extends CustomException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT, 'DUPLICATE_RESOURCE');
  }
}

/**
 * Excepción para recursos no encontrados
 */
export class ResourceNotFoundException extends CustomException {
  constructor(message: string) {
    super(message, HttpStatus.NOT_FOUND);
  }
}

/**
 * Excepción para solicitudes inválidas
 */
export class BadRequestException extends CustomException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

/**
 * Excepción para errores de validación
 */
export class ValidationException extends CustomException {
  constructor(message: string) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

/**
 * Excepción para errores de autenticación
 */
export class UnauthorizedException extends CustomException {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

/**
 * Excepción para errores de permisos
 */
export class ForbiddenException extends CustomException {
  constructor(message: string) {
    super(message, HttpStatus.FORBIDDEN);
  }
}

/**
 * Excepción para errores internos del servidor
 */
export class InternalServerErrorException extends CustomException {
  constructor(message: string = 'Error interno del servidor') {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
