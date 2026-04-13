import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  user_id: string;
  path: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateFolderData {
  name: string;
  parent_id?: string | null;
  user_id: string;
}

export interface UpdateFolderData {
  name?: string;
  parent_id?: string | null;
}

@Injectable()
export class FoldersService {
  constructor(private db: DatabaseService) {}

  async create(data: CreateFolderData): Promise<FolderRow> {
    // Validate parent exists if provided
    if (data.parent_id) {
      const parent = await this.findById(data.parent_id, data.user_id);
      if (!parent) {
        throw new BadRequestException('Parent folder not found');
      }
    }

    const result = await this.db.queryOne<FolderRow>(
      `INSERT INTO folders (name, parent_id, user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name, data.parent_id || null, data.user_id],
    );
    return result!;
  }

  async findAll(userId: string): Promise<FolderRow[]> {
    return this.db.query<FolderRow>(
      'SELECT * FROM folders WHERE user_id = $1 ORDER BY path, name',
      [userId],
    );
  }

  async findById(id: string, userId: string): Promise<FolderRow | null> {
    return this.db.queryOne<FolderRow>(
      'SELECT * FROM folders WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
  }

  async findChildren(parentId: string | null, userId: string): Promise<FolderRow[]> {
    if (parentId === null) {
      return this.db.query<FolderRow>(
        'SELECT * FROM folders WHERE parent_id IS NULL AND user_id = $1 ORDER BY name',
        [userId],
      );
    }
    return this.db.query<FolderRow>(
      'SELECT * FROM folders WHERE parent_id = $1 AND user_id = $2 ORDER BY name',
      [parentId, userId],
    );
  }

  async update(id: string, userId: string, data: UpdateFolderData): Promise<FolderRow> {
    const folder = await this.findById(id, userId);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Validate new parent if provided
    if (data.parent_id !== undefined) {
      if (data.parent_id === id) {
        throw new BadRequestException('Folder cannot be its own parent');
      }
      if (data.parent_id) {
        const parent = await this.findById(data.parent_id, userId);
        if (!parent) {
          throw new BadRequestException('Parent folder not found');
        }
        // Check for circular reference
        if (parent.path.startsWith(folder.path)) {
          throw new BadRequestException('Cannot move folder into its own subfolder');
        }
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

    if (data.parent_id !== undefined) {
      updates.push(`parent_id = $${paramIndex}`);
      values.push(data.parent_id);
      paramIndex++;
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      values.push(id, userId);

      await this.db.query(
        `UPDATE folders SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        values,
      );
    }

    return (await this.findById(id, userId))!;
  }

  async delete(id: string, userId: string): Promise<void> {
    const folder = await this.findById(id, userId);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Check if folder has children
    const children = await this.findChildren(id, userId);
    if (children.length > 0) {
      throw new BadRequestException('Cannot delete folder with subfolders. Delete subfolders first.');
    }

    // Check if folder has invoices
    const invoiceCount = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM invoices WHERE folder_id = $1',
      [id],
    );
    if (parseInt(invoiceCount?.count || '0', 10) > 0) {
      throw new BadRequestException('Cannot delete folder with invoices. Move or delete invoices first.');
    }

    await this.db.query('DELETE FROM folders WHERE id = $1 AND user_id = $2', [id, userId]);
  }
}
