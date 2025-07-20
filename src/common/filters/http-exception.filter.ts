import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { RpcException } from '@nestjs/microservices';

/**
 * Filtro global para manejar excepciones HTTP y RPC
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let error = exception.name || 'Error';

    // Manejar excepciones HTTP estándar
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'object' 
        ? (exceptionResponse as any).message || exception.message
        : exception.message;
    } 
    // Manejar excepciones RPC (microservicios)
    else if (exception instanceof RpcException) {
      const rpcError = exception.getError();
      if (typeof rpcError === 'object' && rpcError !== null) {
        status = (rpcError as any).status || HttpStatus.INTERNAL_SERVER_ERROR;
        message = (rpcError as any).message || 'Error en microservicio';
      } else {
        message = rpcError.toString();
      }
    } 
    // Manejar errores de Mongoose/MongoDB
    else if (exception.name === 'MongoServerError' && exception.code === 11000) {
      status = HttpStatus.CONFLICT;
      message = 'Ya existe un recurso con esos datos';
      
      // Extraer el campo duplicado del mensaje de error
      const keyValue = exception.keyValue;
      if (keyValue) {
        const field = Object.keys(keyValue)[0];
        const value = keyValue[field];
        message = `Ya existe un recurso con ${field}: ${value}`;
      }
    }
    // Otros errores
    else {
      message = exception.message || 'Error interno del servidor';
    }

    // Registrar el error
    this.logger.error(`${request.method} ${request.url} - ${status} - ${message}`);
    if (exception.stack) {
      this.logger.debug(exception.stack);
    }

    // Responder al cliente
    response.status(status).json({
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
