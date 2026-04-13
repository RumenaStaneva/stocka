import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    return this.db.queryOne<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
  }

  async findById(id: string): Promise<UserRow | null> {
    return this.db.queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );
  }
}
