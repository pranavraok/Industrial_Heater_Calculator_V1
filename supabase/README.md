# Supabase Restore

Use `restore_app_database.sql` for a fresh Supabase project.

1. Create a new Supabase project.
2. Open the project SQL Editor.
3. Paste and run `restore_app_database.sql`.
4. Copy the new Project URL and anon public key from Project Settings -> API.
5. Replace `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `script.js`.

The restore keeps duplicate SWG rows from the backup, so the app saves edits by `id`.
