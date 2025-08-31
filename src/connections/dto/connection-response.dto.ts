import { ApiProperty } from '@nestjs/swagger';
import { ConnectionStatus } from '../connection-ref.schema';

export class ConnectionResponseDto {
  @ApiProperty({ 
    description: 'Unique connection identifier',
    example: 'conn_abc123'
  })
  connectionId: string;

  @ApiProperty({ 
    description: 'Company identifier',
    example: 'comp_001'
  })
  companyId: string;

  @ApiProperty({ 
    description: 'Connection channel type',
    example: 'whatsapp_cloud'
  })
  channel: string;

  @ApiProperty({ 
    description: 'Current connection status',
    enum: ConnectionStatus,
    example: ConnectionStatus.PENDING
  })
  status: ConnectionStatus;

  @ApiProperty({ 
    description: 'Facebook OAuth authorization URL to redirect user',
    example: 'https://www.facebook.com/v19.0/dialog/oauth?client_id=123&redirect_uri=...&state=...'
  })
  authUrl: string;

  @ApiProperty({ 
    description: 'Operation success indicator',
    example: true
  })
  success: boolean;

  @ApiProperty({ 
    description: 'Error message if operation failed',
    required: false,
    example: 'Invalid app credentials'
  })
  error?: string;
}

export class OAuthCallbackResponseDto {
  @ApiProperty({ 
    description: 'Callback processing success indicator',
    example: true
  })
  success: boolean;

  @ApiProperty({ 
    description: 'Updated connection status after callback',
    enum: ConnectionStatus,
    example: ConnectionStatus.CODE_RECEIVED
  })
  status: ConnectionStatus;

  @ApiProperty({ 
    description: 'Connection identifier',
    example: 'conn_abc123'
  })
  connectionId?: string;

  @ApiProperty({ 
    description: 'Error message if callback processing failed',
    required: false,
    example: 'Invalid state signature'
  })
  error?: string;
}
