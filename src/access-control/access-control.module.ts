import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';
import { User, UserSchema } from '../user/schemas/user.schema';
import { UserCompanyRole, UserCompanyRoleSchema } from '../user/schemas/user-company-role.schema';
import { Role, RoleSchema } from '../role/schemas/role.schema';
import { RolePermission, RolePermissionSchema } from '../role/schemas/role-permission.schema';
import { Permission, PermissionSchema } from '../permission/schemas/permission.schema';
import { Module as ModuleEntity, ModuleSchema } from './schemas/module.schema';
import { CacheModule } from '../cache/cache.module';
import { TransportsModule } from '../transports/transports.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserCompanyRole.name, schema: UserCompanyRoleSchema },
      { name: Role.name, schema: RoleSchema },
      { name: RolePermission.name, schema: RolePermissionSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: ModuleEntity.name, schema: ModuleSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
    CacheModule,
    TransportsModule,
  ],
  controllers: [AccessControlController],
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
