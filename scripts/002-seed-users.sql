-- Seed initial admin users
-- Password for both users is: password123 (bcrypt hash)

INSERT INTO users (email, password_hash, name) VALUES
  ('admin@stocka.com', '$2a$10$rPQpCqLPGqHqY5LCZPqJQOQjKHqL9mLqKRqPqLPGqHqY5LCZPqJQO', 'Admin User'),
  ('demo@stocka.com', '$2a$10$rPQpCqLPGqHqY5LCZPqJQOQjKHqL9mLqKRqPqLPGqHqY5LCZPqJQO', 'Demo User')
ON CONFLICT (email) DO NOTHING;
