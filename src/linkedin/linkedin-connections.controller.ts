import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LinkedInConnectionsService } from './linkedin-connections.service';
import { CreateLinkedInConnectionDto } from './dto/create-linkedin-connection.dto';
import { StrictValidationPipe } from '../common/validation.pipe';
// import { AuthGuard } from '@nestjs/passport'; // Uncomment when auth is ready

@ApiTags('LinkedIn Connections')
@Controller('api/v1/core/linkedin/connections')
// @UseGuards(AuthGuard('jwt')) // Uncomment when auth is ready
export class LinkedInConnectionsController {
  constructor(private readonly linkedInConnectionsService: LinkedInConnectionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create LinkedIn connection',
    description: 'Creates a new LinkedIn connection by exchanging OAuth code for access tokens and setting up event subscriptions'
  })
  @ApiBody({ type: CreateLinkedInConnectionDto })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'LinkedIn connection created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        connection: {
          type: 'object',
          properties: {
            connectionId: { type: 'string', example: '12345678' },
            companyId: { type: 'string', example: 'company-123' },
            displayName: { type: 'string', example: 'My Company' },
            userId: { type: 'string', example: 'my-company' },
            status: { type: 'string', example: 'active' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Connection already exists' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid OAuth code or configuration' })
  async createConnection(@Body(new StrictValidationPipe()) createDto: CreateLinkedInConnectionDto) {
    const connection = await this.linkedInConnectionsService.createConnection(createDto);
    return { success: true, connection };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get LinkedIn connections',
    description: 'Retrieves all LinkedIn connections for a specific company'
  })
  @ApiQuery({ name: 'companyId', required: true, description: 'Company ID to filter connections' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'LinkedIn connections retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        connections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              connectionId: { type: 'string' },
              displayName: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  })
  async getConnections(@Query('companyId') companyId: string) {
    const connections = await this.linkedInConnectionsService.findAll(companyId);
    return { success: true, connections };
  }

  @Get(':connectionId')
  @ApiOperation({ 
    summary: 'Get LinkedIn connection by ID',
    description: 'Retrieves a specific LinkedIn connection by its connection ID'
  })
  @ApiParam({ name: 'connectionId', description: 'LinkedIn connection ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'LinkedIn connection retrieved successfully' 
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Connection not found' })
  async getConnection(@Param('connectionId') connectionId: string) {
    const connection = await this.linkedInConnectionsService.findOne(connectionId);
    return { success: true, connection };
  }

  @Put(':connectionId')
  @ApiOperation({ 
    summary: 'Update LinkedIn connection',
    description: 'Updates a LinkedIn connection configuration'
  })
  @ApiParam({ name: 'connectionId', description: 'LinkedIn connection ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        webhooks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'HTTP_REQUEST' },
              action: { type: 'string', example: 'https://api.example.com/webhook' },
              params: {
                type: 'object',
                properties: {
                  headers: { type: 'object' }
                }
              }
            }
          }
        },
        status: { type: 'string', enum: ['active', 'inactive'] }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'LinkedIn connection updated successfully' 
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Connection not found' })
  async updateConnection(
    @Param('connectionId') connectionId: string,
    @Body() updateData: any
  ) {
    const connection = await this.linkedInConnectionsService.updateConnection(connectionId, updateData);
    return { success: true, connection };
  }

  @Delete(':connectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete LinkedIn connection',
    description: 'Deletes a LinkedIn connection and all associated data'
  })
  @ApiParam({ name: 'connectionId', description: 'LinkedIn connection ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Connection deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Connection not found' })
  async deleteConnection(@Param('connectionId') connectionId: string) {
    await this.linkedInConnectionsService.deleteConnection(connectionId);
  }

  @Post(':connectionId/refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Refresh LinkedIn access token',
    description: 'Refreshes the access token for a LinkedIn connection using the refresh token'
  })
  @ApiParam({ name: 'connectionId', description: 'LinkedIn connection ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        connection: {
          type: 'object',
          properties: {
            connectionId: { type: 'string' },
            tokenExpiration: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Connection not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Token refresh failed' })
  async refreshToken(@Param('connectionId') connectionId: string) {
    const connection = await this.linkedInConnectionsService.refreshToken(connectionId);
    return { success: true, connection };
  }
}
