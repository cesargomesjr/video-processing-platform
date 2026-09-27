import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../../src/main/database.module';
import { IdentityModule } from '../../../src/main/identity.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
