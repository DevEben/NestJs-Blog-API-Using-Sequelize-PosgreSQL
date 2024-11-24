import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { ExpressAdapter } from '@nestjs/platform-express';
import { connectToDatabase } from './config/database.config';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  // Establish database connection
  await connectToDatabase();

  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
