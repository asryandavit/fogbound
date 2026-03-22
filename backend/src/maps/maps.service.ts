import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { mapsTable } from '../database/schema';
import { eq, asc } from 'drizzle-orm';

@Injectable()
export class MapsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll() {
    return this.databaseService.db
      .select()
      .from(mapsTable)
      .where(eq(mapsTable.isActive, true))
      .orderBy(asc(mapsTable.tier), asc(mapsTable.name));
  }

  async findOne(id: string) {
    const [map] = await this.databaseService.db
      .select()
      .from(mapsTable)
      .where(eq(mapsTable.id, id));

    if (!map) {
      throw new NotFoundException('Map not found');
    }

    return map;
  }

  async findBySlug(slug: string) {
    const [map] = await this.databaseService.db
      .select()
      .from(mapsTable)
      .where(eq(mapsTable.slug, slug));

    if (!map) {
      throw new NotFoundException('Map not found');
    }

    return map;
  }
}
