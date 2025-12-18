import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Convenience methods for common operations
  async query(table: string) {
    return this.supabase.from(table);
  }

  async select(table: string, query: string = '*') {
    return this.supabase.from(table).select(query);
  }

  async insert(table: string, data: any) {
    return this.supabase.from(table).insert(data);
  }

  async update(table: string, id: string, data: any) {
    return this.supabase.from(table).update(data).eq('id', id);
  }

  async delete(table: string, id: string) {
    return this.supabase.from(table).delete().eq('id', id);
  }
}

