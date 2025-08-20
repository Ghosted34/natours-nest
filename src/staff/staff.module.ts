import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  providers: [StaffService],
  controllers: [StaffController],
  imports: [RedisModule],
})
export class StaffModule {}
