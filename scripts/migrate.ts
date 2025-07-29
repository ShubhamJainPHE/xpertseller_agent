import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { supabaseAdmin } from '../lib/database/connection'

interface Migration {
  id: string
  filename: string
  sql: string
  applied_at?: string
}

class MigrationRunner {
  private migrationsDir = join(process.cwd(), 'database/migrations')

  async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql })
    if (error) {
      throw new Error(`Failed to create migrations table: ${error.message}`)
    }
  }

  async getAppliedMigrations(): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('_migrations')
      .select('filename')
      .order('id')

    if (error) {
      // Table might not exist yet
      return []
    }

    return data?.map(row => row.filename) || []
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const appliedMigrations = await this.getAppliedMigrations()
    const allMigrationFiles = readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    const pendingMigrations: Migration[] = []

    for (const filename of allMigrationFiles) {
      if (!appliedMigrations.includes(filename)) {
        const filepath = join(this.migrationsDir, filename)
        const sql = readFileSync(filepath, 'utf-8')
        
        pendingMigrations.push({
          id: filename.split('_')[0],
          filename,
          sql
        })
      }
    }

    return pendingMigrations
  }

  async applyMigration(migration: Migration): Promise<void> {
    console.log(`Applying migration: ${migration.filename}`)
    
    try {
      // Execute migration SQL
      const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', { 
        sql: migration.sql 
      })
      
      if (sqlError) {
        throw new Error(`Migration SQL failed: ${sqlError.message}`)
      }

      // Record migration as applied
      const { error: recordError } = await supabaseAdmin
        .from('_migrations')
        .insert({ filename: migration.filename })

      if (recordError) {
        throw new Error(`Failed to record migration: ${recordError.message}`)
      }

      console.log(`✅ Migration applied: ${migration.filename}`)
    } catch (error) {
      console.error(`❌ Migration failed: ${migration.filename}`, error)
      throw error
    }
  }

  async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Starting database migrations...')
      
      await this.createMigrationsTable()
      const pendingMigrations = await this.getPendingMigrations()

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations')
        return
      }

      console.log(`Found ${pendingMigrations.length} pending migrations`)

      for (const migration of pendingMigrations) {
        await this.applyMigration(migration)
      }

      console.log('🎉 All migrations completed successfully')
    } catch (error) {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    }
  }
}

// CLI interface
if (require.main === module) {
  const runner = new MigrationRunner()
  runner.runMigrations()
}

export default MigrationRunner