import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface TagRow {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: Date;
}

export interface CreateTagData {
  name: string;
  color?: string;
  user_id: string;
}

export interface UpdateTagData {
  name?: string;
  color?: string;
}

@Injectable()
export class TagsService {
  constructor(private db: DatabaseService) {}

  async create(data: CreateTagData): Promise<TagRow> {
    // Check for duplicate name
    const existing = await this.db.queryOne<TagRow>(
      'SELECT * FROM tags WHERE name = $1 AND user_id = $2',
      [data.name, data.user_id],
    );
    if (existing) {
      throw new ConflictException('Tag with this name already exists');
    }

    const result = await this.db.queryOne<TagRow>(
      `INSERT INTO tags (name, color, user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name, data.color || '#6B7280', data.user_id],
    );
    return result!;
  }

  async findAll(userId: string): Promise<TagRow[]> {
    return this.db.query<TagRow>(
      'SELECT * FROM tags WHERE user_id = $1 ORDER BY name',
      [userId],
    );
  }

  async findById(id: string, userId: string): Promise<TagRow | null> {
    return this.db.queryOne<TagRow>(
      'SELECT * FROM tags WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
  }

  async update(id: string, userId: string, data: UpdateTagData): Promise<TagRow> {
    const tag = await this.findById(id, userId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Check for duplicate name if changing name
    if (data.name && data.name !== tag.name) {
      const existing = await this.db.queryOne<TagRow>(
        'SELECT * FROM tags WHERE name = $1 AND user_id = $2 AND id != $3',
        [data.name, userId, id],
      );
      if (existing) {
        throw new ConflictException('Tag with this name already exists');
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(data.name);
      paramIndex++;
    }

    if (data.color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      values.push(data.color);
      paramIndex++;
    }

    if (updates.length > 0) {
      values.push(id, userId);
      await this.db.query(
        `UPDATE tags SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        values,
      );
    }

    return (await this.findById(id, userId))!;
  }

  async delete(id: string, userId: string): Promise<void> {
    const tag = await this.findById(id, userId);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Remove tag from all invoices first
    await this.db.query('DELETE FROM invoice_tags WHERE tag_id = $1', [id]);
    await this.db.query('DELETE FROM tags WHERE id = $1 AND user_id = $2', [id, userId]);
  }
}
