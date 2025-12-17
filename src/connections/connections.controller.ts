import { Controller, Post, Get, Body, Query, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { ConnectionsService } from './connections.service';
import { InitConnectionDto } from './dto/init-connection.dto';
import { ConnectionResponseDto, OAuthCallbackResponseDto } from './dto/connection-response.dto';
import { WhatsAppConnectionCreatedPayload, WhatsAppConnectionFailedPayload, InstagramConnectionCreatedPayload, InstagramConnectionFailedPayload } from './interfaces/nats-payloads.interface';

@ApiTags('Connections')
@Controller('api/v1/core/connections')
export class ConnectionsController {
  private readonly logger = new Logger(ConnectionsController.name);

  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post('init')
  @ApiOperation({ summary: 'Initialize a new connection (WhatsApp Cloud)' })
  @ApiResponse({ status: 201, description: 'Connection initialized successfully', type: ConnectionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async initConnection(@Body() initDto: InitConnectionDto): Promise<ConnectionResponseDto> {
    this.logger.log(`Initializing connection for company: ${initDto.companyId}`);
    return this.connectionsService.initConnection(initDto);
  }

  @Get('/status/:connectionId')
  @ApiOperation({ summary: 'Get connection status' })
  @ApiParam({ name: 'connectionId', description: 'Connection ID' })
  @ApiResponse({ status: 200, description: 'Connection status retrieved' })
  async getConnectionStatus(@Param('connectionId') connectionId: string) {
    return this.connectionsService.getConnectionStatus(connectionId);
  }

  @Get('/company/:companyId')
  @ApiOperation({ summary: 'Get all connections for a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company connections retrieved' })
  async getCompanyConnections(@Param('companyId') companyId: string) {
    return this.connectionsService.getConnectionsByCompany(companyId);
  }

  // NATS Event Handlers
  @EventPattern('whatsapp.connection.created')
  async handleConnectionCreated(payload: WhatsAppConnectionCreatedPayload) {
    this.logger.log(`Received connection created event: ${payload.connectionId}`);
    await this.connectionsService.handleConnectionCreated(payload);
  }

  @EventPattern('whatsapp.connection.failed')
  async handleConnectionFailed(payload: WhatsAppConnectionFailedPayload) {
    this.logger.log(`Received connection failed event: ${payload.connectionId}`);
    await this.connectionsService.handleConnectionFailed(payload);
  }

  @EventPattern('instagram.connection.created')
  async handleInstagramConnectionCreated(payload: InstagramConnectionCreatedPayload) {
    this.logger.log(`Received Instagram connection created event: ${payload.connectionId}`);
    await this.connectionsService.handleInstagramConnectionCreated(payload);
  }

  @EventPattern('instagram.connection.failed')
  async handleInstagramConnectionFailed(payload: InstagramConnectionFailedPayload) {
    this.logger.log(`Received Instagram connection failed event: ${payload.error}`);
    await this.connectionsService.handleInstagramConnectionFailed(payload);
  }
}

@Controller('auth/facebook')
export class FacebookOAuthController {
  private readonly logger = new Logger(FacebookOAuthController.name);

  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get('callback')
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @ApiQuery({ name: 'code', description: 'OAuth authorization code' })
  @ApiQuery({ name: 'state', description: 'OAuth state parameter' })
  @ApiResponse({ status: 200, description: 'OAuth callback processed', type: OAuthCallbackResponseDto })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string
  ): Promise<OAuthCallbackResponseDto> {
    this.logger.log(`Processing OAuth callback with state: ${state?.substring(0, 20)}...`);
    return this.connectionsService.handleOAuthCallback(code, state);
  }
}
