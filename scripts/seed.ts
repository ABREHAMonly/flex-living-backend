//scripts/seed.ts
import mongoose from 'mongoose';
import { config } from '../src/config/env';
import { HostawayService } from '../src/services/hostaway.service';
import { logger } from '../src/utils/logger';

const seedDatabase = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info('Connected to MongoDB for seeding');
    
    // Sync Hostaway reviews
    const result = await HostawayService.syncReviews();
    logger.info(`Seeding completed: ${result.imported} imported, ${result.updated} updated`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();