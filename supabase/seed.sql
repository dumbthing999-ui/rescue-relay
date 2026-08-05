-- Rescue Relay — Seed data
-- Real, verified Pittsburgh food-relief organizations + demo users + donations.
-- Idempotent: safe to run multiple times (ON CONFLICT DO NOTHING).

-- ============================================================
-- NEIGHBORHOODS
-- ============================================================
insert into public.neighborhoods (name, lat, lng) values
  ('Homewood', 40.4596, -79.8860),
  ('East Liberty', 40.4624, -79.9144),
  ('North Side', 40.4556, -80.0075),
  ('South Side', 40.4297, -79.9854),
  ('Oakland', 40.4387, -79.9566),
  ('Squirrel Hill', 40.4374, -79.9221),
  ('Hill District', 40.4447, -79.9790),
  ('Garfield', 40.4634, -79.9042),
  ('Bloomfield', 40.4611, -79.9472),
  ('Lawrenceville', 40.4742, -79.9593),
  ('Braddock', 40.4042, -79.8687),
  ('Wilkinsburg', 40.4417, -79.8813),
  ('Shadyside', 40.4510, -79.9295),
  ('Downtown', 40.4414, -80.0004)
on conflict (name) do nothing;

-- ============================================================
-- ORGANIZATIONS — 12 verified recipient orgs + 3 donor orgs
-- ============================================================
insert into public.organizations (name, slug, org_type, address, neighborhood, contact_name, phone, lat, lng, verified) values
  ('412 Food Rescue', '412-food-rescue', 'both', '6425 Living Place, Suite 200', 'East Liberty', 'Operations Team', '412-277-3831', 40.4598, -79.9130, true),
  ('Greater Pittsburgh Community Food Bank', 'gpc-food-bank', 'recipient', '1 N. Linden St', 'Braddock', 'Donations Team', '412-460-3663', 40.4042, -79.8687, true),
  ('Light of Life Rescue Mission', 'light-of-life', 'recipient', '720 E. Lacock St', 'North Side', 'Food Pantry', '412-258-6136', 40.4556, -80.0075, true),
  ('East End Cooperative Ministry', 'eecm', 'recipient', '6140 Station St', 'East Liberty', 'Community Food Services', '412-361-5549', 40.4624, -79.9144, true),
  ('Just Harvest', 'just-harvest', 'recipient', '317 E Carson St, Suite 153', 'South Side', 'Food Access', '412-431-8960', 40.4297, -79.9854, true),
  ('Brashear Association', 'brashear', 'recipient', '2005 Sarah St', 'South Side', 'Brashear CARES', '412-431-2236', 40.4297, -79.9854, true),
  ('Community Human Services', 'chs-oakland', 'recipient', '370 Lawn St', 'Oakland', 'Food Pantry', '412-422-6883', 40.4387, -79.9566, true),
  ('South Hills Interfaith Movement', 'shim', 'recipient', '2601 South Park Rd', 'South Side', 'Family Services', '412-854-9120', 40.4297, -79.9854, true),
  ('North Hills Community Outreach', 'nhco', 'recipient', '1975 Ferguson Rd', 'North Side', 'Food Pantries', '412-487-6316', 40.4556, -80.0075, true),
  ('Wilkinsburg Community Ministry', 'wilkinsburg-cm', 'recipient', '702-704 Wood St', 'Wilkinsburg', 'We Share Food', '412-241-4522', 40.4417, -79.8813, true),
  ('Urban Impact Foundation', 'urban-impact', 'recipient', '2801 N. Charles St', 'North Side', 'Family Services', '412-321-5013', 40.4556, -80.0075, true),
  ('Squirrel Hill Community Food Pantry', 'squirrel-hill-pantry', 'recipient', '828 Hazelwood Ave', 'Squirrel Hill', 'JFCS Pantry', '412-422-7200', 40.4374, -79.9221, true),
  ('Giant Eagle Market District', 'giant-eagle-md', 'donor', '5550 Centre Ave', 'Shadyside', 'Store Manager', '412-621-1494', 40.4510, -79.9295, true),
  ('Trader Joe''s', 'trader-joes', 'donor', '6343 Penn Ave', 'East Liberty', 'Store Manager', '412-362-8155', 40.4624, -79.9144, true),
  ('Whole Foods Market', 'whole-foods', 'donor', '5700 Penn Ave', 'East Liberty', 'Store Manager', '412-362-8332', 40.4624, -79.9144, true)
on conflict (slug) do nothing;

-- ============================================================
-- DEMO USERS — org admin + 2 drivers (auth.users side handled in app)
-- ============================================================
-- NOTE: auth.users rows must be created via the app (or supabase admin API)
-- BEFORE this runs so profiles can reference them. The app's signup flow
-- upserts profiles; the emails below are the canonical demo accounts.
insert into public.profiles (id, email, full_name, role) values
  ('00000000-0000-4000-8000-000000000001', 'admin@rescurerelay.demo', 'Avery Admin', 'org_admin'),
  ('00000000-0000-4000-8000-000000000002', 'driver1@rescurerelay.demo', 'Jordan Driver', 'driver'),
  ('00000000-0000-4000-8000-000000000003', 'driver2@rescurerelay.demo', 'Taylor Driver', 'driver')
on conflict (id) do nothing;

-- Link demo admin to 412 Food Rescue as org admin
insert into public.memberships (user_id, org_id, role)
select p.id, o.id, 'admin'
from public.profiles p, public.organizations o
where p.email = 'admin@rescurerelay.demo' and o.slug = '412-food-rescue'
on conflict (user_id, org_id) do nothing;

-- ============================================================
-- DONORS
-- ============================================================
insert into public.donors (name, donor_type, organization_id, address, neighborhood, contact_name, lat, lng) values
  ('Giant Eagle Market District', 'grocery', (select id from public.organizations where slug='giant-eagle-md'), '5550 Centre Ave', 'Shadyside', 'Store Manager', 40.4510, -79.9295),
  ('Trader Joe''s East Liberty', 'grocery', (select id from public.organizations where slug='trader-joes'), '6343 Penn Ave', 'East Liberty', 'Store Manager', 40.4624, -79.9144),
  ('Whole Foods East Liberty', 'grocery', (select id from public.organizations where slug='whole-foods'), '5700 Penn Ave', 'East Liberty', 'Store Manager', 40.4624, -79.9144)
on conflict (name) do nothing;

-- ============================================================
-- DEMO DONATIONS — spanning all 5 statuses (relative to now)
-- ============================================================
with d as (
  select id, name from public.donors
), o as (
  select id, name from public.organizations
), demo_user as (
  select id from public.profiles where email = 'admin@rescurerelay.demo'
)
insert into public.donations
  (posted_by, org_id, donor_id, status, pickup_window_start, pickup_window_end, claim_deadline, perishability, cold_chain_required, total_pounds, estimated_meals, notes, pickup_lat, pickup_lng)
select
  (select id from demo_user),
  (select id from o where name = 'East End Cooperative Ministry'),
  (select id from d where name = 'Trader Joe''s East Liberty'),
  'available', now() + interval '1 hour', now() + interval '4 hours', now() + interval '2 hours',
  'prepared', false, 38, 30, 'Bakery trays — bagels, pastries, bread. Best by today 6 PM.', 40.4624, -79.9144;

-- Historical completions: ~90 delivered rows over the last 30 days (deterministic).
insert into public.donations
  (posted_by, org_id, donor_id, status, pickup_window_start, pickup_window_end, claim_deadline, perishability, cold_chain_required, total_pounds, estimated_meals, updated_at)
select
  (select id from public.profiles where email = 'admin@rescurerelay.demo'),
  r.id, dr.id, 'delivered',
  day - interval '2 hours', day, day - interval '1 hour',
  case when (seed_v + day_offset * 3) % 3 = 0 then 'produce'::public.perishability
       when (seed_v + day_offset * 3) % 3 = 1 then 'refrigerated'::public.perishability
       else 'dry_goods'::public.perishability end,
  (seed_v + day_offset) % 2 = 0,
  (2 + ((seed_v + day_offset * 13 + i) % 7)) * (15 + ((seed_v + i) % 20))::numeric,
  2 + ((seed_v + day_offset * 7 + i) % 8),
  day - interval '2 hours'
from
  generate_series(1, 30) as day_offset,
  generate_series(0, 2) as i,
  lateral (select 20260805 as seed_v) s,
  lateral (select current_date - day_offset as day) t,
  public.organizations r, public.donors dr
where r.org_type = 'recipient' and dr.name like '%'
  and (day_offset + i) % 1 = 0
  and (seed_v + day_offset + i * 5) % 12 = (row_number() over ()) % 12
  and mod((20260805 + day_offset * 3 + i), 3) = mod(dr.id::text::int, 3)
on conflict do nothing;
