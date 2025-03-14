import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './shared/schema';

// Parse the database URL from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function main() {
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log('Starting migration...');
  
  try {
    // Create all tables in the schema
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        full_name TEXT,
        role TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL, 
        content_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT,
        enquiry_id INTEGER,
        uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS product_specifications (
        id SERIAL PRIMARY KEY,
        product_type TEXT NOT NULL,
        dimensions TEXT NOT NULL,
        material TEXT NOT NULL,
        quantity TEXT NOT NULL,
        print_type TEXT NOT NULL,
        ai_confidence FLOAT,
        enquiry_id INTEGER NOT NULL,
        verified BOOLEAN
      );

      CREATE TABLE IF NOT EXISTS enquiries (
        id SERIAL PRIMARY KEY,
        customer_name TEXT NOT NULL,
        enquiry_code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        contact_person TEXT,
        contact_email TEXT,
        date_received TIMESTAMP NOT NULL DEFAULT NOW(),
        deadline TIMESTAMP,
        special_instructions TEXT,
        delivery_requirements TEXT,
        assigned_to INTEGER,
        processing_time INTEGER,
        ai_confidence INTEGER,
        processed_at TIMESTAMP,
        processed_by TEXT
      );

      CREATE TABLE IF NOT EXISTS spec_sheets (
        id SERIAL PRIMARY KEY,
        enquiry_id INTEGER NOT NULL,
        content JSONB NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        generated_by TEXT
      );

      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
    `);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();