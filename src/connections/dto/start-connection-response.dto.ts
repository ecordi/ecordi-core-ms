import { ApiProperty } from '@nestjs/swagger';

export class StartConnectionResponseDto {
  @ApiProperty({ description: 'URL para iniciar el flujo de autorización en Meta', example: 'https://www.facebook.com/v18.0/dialog/oauth?client_id=...&redirect_uri=...&state=...' })
  authorizeUrl!: string;

  @ApiProperty({ description: 'Redirect URI registrada en Meta (callback OAuth)', example: 'https://core.ecordi.com/connections/callback' })
  redirectUri!: string;

  @ApiProperty({ description: 'URL pública del webhook a configurar', example: 'https://core.ecordi.com/webhooks/whatsapp' })
  webhookUrl!: string;
}
