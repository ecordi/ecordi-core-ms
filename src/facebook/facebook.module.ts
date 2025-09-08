import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransportsModule } from '../transports/transports.module';
import { FacebookController } from './facebook.controller';
import { FacebookService } from './facebook.service';

@Module({
  imports: [ConfigModule, TransportsModule],
  controllers: [FacebookController],
  providers: [FacebookService],
  exports: [FacebookService],
})
export class FacebookModule {}
