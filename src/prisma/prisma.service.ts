import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(cfg: ConfigService) {
    super({
      datasources: {
        db: {
          url: cfg.get('DATABASE_URL') || 'file:./dev.db',
        },
      },
      log: ['warn', 'error'],
    });

    this.$connect()
      .catch((error) => {
        console.error('Failed to connect to the database:', error);
        process.exit(1);
      })
      .finally(() => {
        console.log('Prisma client connected successfully');
      });
  }
}
