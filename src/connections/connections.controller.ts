import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  HttpStatus,
  Logger,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { ConnectionsService } from './connections.service';
import { InitConnectionDto } from './dto/init-connection.dto';
import { ConnectionResponseDto } from './dto/connection-response.dto';

@ApiTags('connections')
@Controller()
export class ConnectionsController {
  private readonly logger = new Logger(ConnectionsController.name);

  constructor(private readonly connections: ConnectionsService) {}

  @Post('api/v1/core/connections/init')
  @ApiOperation({ summary: 'Initialize WhatsApp Cloud API connection' })
  @ApiBody({ type: InitConnectionDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: ConnectionResponseDto })
  async initConnection(@Body() dto: InitConnectionDto): Promise<ConnectionResponseDto> {
    return this.connections.initWhatsAppConnection(dto);
  }

  @Get('connections/callback')
  @ApiOperation({ summary: 'OAuth callback from Facebook' })
  @ApiQuery({ name: 'state', required: true, description: 'Signed state parameter' })
  @ApiQuery({ name: 'code', required: true, description: 'Authorization code from Facebook' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Connection processed successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid state or code' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log(`[callback] Processing OAuth callback with state: ${state?.substring(0, 20)}...`);
    
    if (!state || !code) {
      return res.status(HttpStatus.BAD_REQUEST).json({ 
        success: false, 
        message: 'Missing state or code parameter' 
      });
    }

    try {
      const result = await this.connections.createWhatsAppConnection(code, state);
      this.logger.log(`[callback] Connection processed: ${result.connectionId}`);
      
      // Return success response
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Connection processed successfully',
        connectionId: result.connectionId,
        status: result.status,
      });
    } catch (error: any) {
      this.logger.error(`[callback] Failed to process connection: ${error.message}`);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to process connection',
      });
    }
  }

  @Get('api/v1/core/connections/:companyId')
  @ApiOperation({ summary: 'Get connections for a company' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of connections' })
  async getConnectionsByCompany(@Param('companyId') companyId: string) {
    const connections = await this.connections.getConnectionsByCompany(companyId);
    return { connections };
  }

  @Get('api/v1/core/connections/detail/:connectionId')
  @ApiOperation({ summary: 'Get connection details' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Connection details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Connection not found' })
  async getConnectionById(@Param('connectionId') connectionId: string) {
    const connection = await this.connections.getConnectionById(connectionId);
    if (!connection) {
      return { success: false, message: 'Connection not found' };
    }
    return { connection };
  }

  @EventPattern('whatsapp.connection.created')
  handleConnectionCreated(@Payload() data: any) {
    this.logger.log(`[NATS] Received whatsapp.connection.created: ${JSON.stringify(data)}`);
    this.connections.handleConnectionCreated(data);
  }

  @EventPattern('whatsapp.connection.failed')
  handleConnectionFailed(@Payload() data: any) {
    this.logger.log(`[NATS] Received whatsapp.connection.failed: ${JSON.stringify(data)}`);
    this.connections.handleConnectionFailed(data);
  }
}
