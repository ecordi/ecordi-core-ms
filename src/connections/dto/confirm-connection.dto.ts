import { ApiProperty } from '@nestjs/swagger';

export class ConfirmConnectionDto {
  @ApiProperty({ description: 'ID de la compañía', example: 'comp_123' })
  companyId!: string;

  @ApiProperty({ description: 'ID de referencia de la conexión externa (proveniente del canal WA)', example: 'wa_1234567890' })
  connectionId!: string;

  @ApiProperty({ description: 'Phone Number ID devuelto por Meta', example: '1234567890' })
  phoneNumberId!: string;

  @ApiProperty({ description: 'Número telefónico visible', example: '+5491122334455' })
  displayPhoneNumber!: string;

  @ApiProperty({ description: 'WABA ID opcional', required: false, example: '987654321' })
  wabaId?: string;

  @ApiProperty({ description: 'Metadatos adicionales', required: false, example: { project: 'tienda', env: 'prod' } })
  meta?: Record<string, any>;
}
