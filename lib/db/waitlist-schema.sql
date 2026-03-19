-- Run this in the Vercel Postgres SQL runner (Storage > your database > Query) or in any Postgres client connected to your Vercel Postgres database.

CREATE TABLE IF NOT EXISTS waitlist (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
