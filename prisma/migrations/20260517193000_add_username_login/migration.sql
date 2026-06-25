-- Add a distinct login field. Existing users can keep it null until they update their profile.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
