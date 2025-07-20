import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { Role, RoleSchema } from './schemas/role.schema';
import { RolePermission, RolePermissionSchema } from './schemas/role-permission.schema';
import { Permission, PermissionSchema } from '../permission/schemas/permission.schema';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: RolePermission.name, schema: RolePermissionSchema },
      { name: Permission.name, schema: PermissionSchema },
    ]),
    CacheModule,
  ],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
