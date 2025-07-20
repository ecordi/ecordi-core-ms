import { ApiProperty } from '@nestjs/swagger';

export class ModuleAccessDto {
  @ApiProperty({ example: true })
  visible: boolean;

  @ApiProperty({ example: true, required: false })
  create?: boolean;

  @ApiProperty({ example: false, required: false })
  read?: boolean;

  @ApiProperty({ example: false, required: false })
  update?: boolean;

  @ApiProperty({ example: false, required: false })
  delete?: boolean;
}

export class UserContextResponseDto {
  @ApiProperty({ example: '60d5ec9af682fbd12a0b4d8e' })
  userId: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: '60d5ec9af682fbd12a0b4d8f' })
  companyId: string;

  @ApiProperty({ example: 'Acme Inc.' })
  companyName: string;

  @ApiProperty({ type: [String], example: ['admin', 'user'] })
  roles: string[];

  @ApiProperty({ type: [String], example: ['products:create', 'orders:read'] })
  permissions: string[];

  @ApiProperty({
    example: {
      products: { visible: true, create: true, update: false },
      orders: { visible: true, create: false, update: false },
      bookings: { visible: false }
    }
  })
  modules: Record<string, ModuleAccessDto>;

  @ApiProperty({ example: 50 })
  accessLevel: number;
}
