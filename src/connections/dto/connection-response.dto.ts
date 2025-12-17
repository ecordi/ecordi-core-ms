import { ApiProperty } from '@nestjs/swagger';
import { ConnectionStatus, ConnectionProvider } from '../schemas/core-connection.schema';

export class ConnectionResponseDto {
  @ApiProperty({ description: 'Connection ID' })
  connectionId: string;

  @ApiProperty({ description: 'Company ID' })
  companyId: string;

  @ApiProperty({ description: 'Connection provider', enum: ConnectionProvider })
  provider: ConnectionProvider;

  @ApiProperty({ description: 'Connection status', enum: ConnectionStatus })
  status: ConnectionStatus;

  @ApiProperty({ description: 'Authorization URL for OAuth flow', required: false })
  authUrl?: string;

  @ApiProperty({ description: 'Success flag' })
  success: boolean;

  @ApiProperty({ description: 'Error message if any', required: false })
  error?: string;
}

export class OAuthCallbackResponseDto {
  @ApiProperty({ description: 'Success flag' })
  success: boolean;

  @ApiProperty({ description: 'Connection status', enum: ConnectionStatus })
  status: ConnectionStatus;

  @ApiProperty({ description: 'Connection ID' })
  connectionId?: string;

  @ApiProperty({ description: 'Error message if any', required: false })
  error?: string;
}
