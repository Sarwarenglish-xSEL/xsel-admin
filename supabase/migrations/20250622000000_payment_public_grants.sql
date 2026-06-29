-- Table-level grants required for the public payment page (anon) and student purchases.
-- RLS policies alone are not enough; PostgreSQL also requires GRANT on the table.

grant usage on schema public to anon, authenticated;

grant select on table public.courses to anon, authenticated;

grant select, insert on table public.purchases to authenticated;
