-- Rescue Relay — Seed data
-- Real, verified Pittsburgh food-relief organizations + demo users + donations.
-- Idempotent where possible (ON CONFLICT DO NOTHING for inserts that have a
-- natural key). The historical-completion generator is NOT idempotent — it
-- uses fixed-seed arithmetic so re-running it appends another 90 rows. That
-- is intentional for demo work; production runs once.

-- ============================================================
-- NEIGHBORHOODS
-- ============================================================
insert into public.neighborhoods (name, lat, lng) values
  ('Homewood',       40.4596, -79.8860),
  ('East Liberty',   40.4624, -79.9144),
  ('North Side',     40.4556, -80.0075),
  ('South Side',     40.4297, -79.9854),
  ('Oakland',        40.4387, -79.9566),
  ('Squirrel Hill',  40.4374, -79.9221),
  ('Hill District',  40.4447, -79.9790),
  ('Garfield',       40.4634, -79.9042),
  ('Bloomfield',     40.4611, -79.9472),
  ('Lawrenceville',  40.4742, -79.9593),
  ('Braddock',       40.4042, -79.8687),
  ('Wilkinsburg',    40.4417, -79.8813),
  ('Shadyside',      40.4510, -79.9295),
  ('Downtown',       40.4414, -80.0004)
on conflict (name) do nothing;

-- ============================================================
-- ORGANIZATIONS — 12 recipient orgs + 3 donor orgs
-- ============================================================
insert into public.organizations
  (name, slug, org_type, address, neighborhood, contact_name, phone, lat, lng, verified)
values
  ('412 Food Rescue',                     '412-food-rescue',     'both',      '6425 Living Place, Suite 200', 'East Liberty',  'Operations Team',          '412-277-3831', 40.4598, -79.9130, true),
  ('Greater Pittsburgh Community Food Bank','gpc-food-bank',     'recipient', '1 N. Linden St',              'Braddock',      'Donations Team',           '412-460-3663', 40.4042, -79.8687, true),
  ('Light of Life Rescue Mission',        'light-of-life',       'recipient', '720 E. Lacock St',            'North Side',    'Food Pantry',              '412-258-6136', 40.4556, -80.0075, true),
  ('East End Cooperative Ministry',       'eecm',                'recipient', '6140 Station St',             'East Liberty',  'Community Food Services',  '412-361-5549', 40.4624, -79.9144, true),
  ('Just Harvest',                        'just-harvest',        'recipient', '317 E Carson St, Suite 153',  'South Side',    'Food Access',              '412-431-8960', 40.4297, -79.9854, true),
  ('Brashear Association',                'brashear',            'recipient', '2005 Sarah St',               'South Side',    'Brashear CARES',           '412-431-2236', 40.4297, -79.9854, true),
  ('Community Human Services',            'chs-oakland',         'recipient', '370 Lawn St',                 'Oakland',       'Food Pantry',              '412-422-6883', 40.4387, -79.9566, true),
  ('South Hills Interfaith Movement',     'shim',                'recipient', '2601 South Park Rd',          'South Side',    'Family Services',          '412-854-9120', 40.4297, -79.9854, true),
  ('North Hills Community Outreach',      'nhco',                'recipient', '1975 Ferguson Rd',            'North Side',    'Food Pantries',            '412-487-6316', 40.4556, -80.0075, true),
  ('Wilkinsburg Community Ministry',      'wilkinsburg-cm',      'recipient', '702-704 Wood St',             'Wilkinsburg',   'We Share Food',            '412-241-4522', 40.4417, -79.8813, true),
  ('Urban Impact Foundation',             'urban-impact',        'recipient', '2801 N. Charles St',          'North Side',    'Family Services',          '412-321-5013', 40.4556, -80.0075, true),
  ('Squirrel Hill Community Food Pantry', 'squirrel-hill-pantry','recipient', '828 Hazelwood Ave',           'Squirrel Hill', 'JFCS Pantry',              '412-422-7200', 40.4374, -79.9221, true),
  ('Giant Eagle Market District',         'giant-eagle-md',      'donor',     '5550 Centre Ave',             'Shadyside',     'Store Manager',            '412-621-1494', 40.4510, -79.9295, true),
  ('Trader Joe''s',                       'trader-joes',         'donor',     '6343 Penn Ave',               'East Liberty',  'Store Manager',            '412-362-8155', 40.4624, -79.9144, true),
  ('Whole Foods Market',                  'whole-foods',         'donor',     '5700 Penn Ave',               'East Liberty',  'Store Manager',            '412-362-8332', 40.4624, -79.9144, true)
on conflict (slug) do nothing;

-- ============================================================
-- DONORS
-- ============================================================
insert into public.donors
  (name, donor_type, organization_id, address, neighborhood, contact_name, lat, lng, active)
values
  ('Giant Eagle Market District', 'grocery',
    (select id from public.organizations where slug = 'giant-eagle-md'),
    '5550 Centre Ave', 'Shadyside',   'Store Manager', 40.4510, -79.9295, true),
  ('Trader Joe''s East Liberty',   'grocery',
    (select id from public.organizations where slug = 'trader-joes'),
    '6343 Penn Ave',   'East Liberty','Store Manager', 40.4624, -79.9144, true),
  ('Whole Foods East Liberty',     'grocery',
    (select id from public.organizations where slug = 'whole-foods'),
    '5700 Penn Ave',   'East Liberty','Store Manager', 40.4624, -79.9144, true)
on conflict do nothing;

-- ============================================================
-- DEMO USERS
-- Emails are *@rescurerelay.demo — not real addresses, no real org emails.
-- These UUIDs MUST match the auth.users rows the signup flow creates; the
-- app's first signup should pre-create these in auth.users or you can use
-- the Supabase dashboard to create them and then run this seed.
-- ============================================================
insert into public.profiles (id, email, full_name, role, notify_radius_m) values
  ('00000000-0000-4000-8000-000000000001', 'admin@rescurerelay.demo',  'Avery Admin',   'org_admin', 8000),
  ('00000000-0000-4000-8000-000000000002', 'driver1@rescurerelay.demo','Jordan Driver', 'driver',    8000),
  ('00000000-0000-4000-8000-000000000003', 'driver2@rescurerelay.demo','Taylor Driver', 'driver',    8000)
on conflict (id) do nothing;

-- org_admin → 412 Food Rescue
insert into public.memberships (user_id, org_id, role)
select p.id, o.id, 'admin'::public.membership_role
from public.profiles p, public.organizations o
where p.email = 'admin@rescurerelay.demo' and o.slug = '412-food-rescue'
on conflict (user_id, org_id) do nothing;

-- driver1 + driver2 are independent (no org membership) so they can claim
-- across any recipient. They live near East Liberty.
update public.profiles
   set home_lat = 40.4624, home_lng = -79.9144
 where email in ('driver1@rescurerelay.demo', 'driver2@rescurerelay.demo');

-- ============================================================
-- 15 DEMO DONATIONS — spans all 5 non-cancelled statuses
-- ============================================================
-- Idempotency: keyed on (notes) substring below; we delete then re-insert
-- the demo set every seed run so re-running stays clean.
delete from public.donations where notes like 'demo:%';

with
  demo_user as (select id from public.profiles where email = 'admin@rescurerelay.demo'),
  donor_ge  as (select id from public.donors where name = 'Giant Eagle Market District'),
  donor_tj  as (select id from public.donors where name = 'Trader Joe''s East Liberty'),
  donor_wf  as (select id from public.donors where name = 'Whole Foods East Liberty'),
  org_eecm  as (select id from public.organizations where slug = 'eecm'),
  org_lol   as (select id from public.organizations where slug = 'light-of-life'),
  org_jh    as (select id from public.organizations where slug = 'just-harvest'),
  org_chs   as (select id from public.organizations where slug = 'chs-oakland'),
  org_shp   as (select id from public.organizations where slug = 'squirrel-hill-pantry'),
  org_fr    as (select id from public.organizations where slug = '412-food-rescue')
insert into public.donations
  (posted_by, org_id, donor_id, status, pickup_window_start, pickup_window_end, claim_deadline,
   perishability, cold_chain_required, total_pounds, estimated_meals, notes,
   pickup_lat, pickup_lng, geofence_radius_m)
values
  -- 1 available, fresh
  ((select id from demo_user), (select id from org_eecm), (select id from donor_tj),
   'available', now() + interval '1 hour',  now() + interval '4 hours', now() + interval '2 hours',
   'prepared',   false, 38.00, 30, 'demo:available-bakery',
   40.4624, -79.9144, 200),
  -- 2 available, produce
  ((select id from demo_user), (select id from org_lol),  (select id from donor_wf),
   'available', now() + interval '30 minutes', now() + interval '3 hours', now() + interval '90 minutes',
   'produce',    false, 22.50, 18, 'demo:available-produce',
   40.4624, -79.9144, 200),
  -- 3 available, refrigerated — driver should arrive with cooler
  ((select id from demo_user), (select id from org_jh),  (select id from donor_ge),
   'available', now() + interval '15 minutes', now() + interval '2 hours', now() + interval '45 minutes',
   'refrigerated', true, 14.75, 11, 'demo:available-dairy',
   40.4510, -79.9295, 250),
  -- 4 claimed
  ((select id from demo_user), (select id from org_chs),  (select id from donor_tj),
   'claimed', now() - interval '30 minutes', now() + interval '90 minutes', now() + interval '60 minutes',
   'prepared',   false, 26.00, 21, 'demo:claimed-today',
   40.4624, -79.9144, 200),
  -- 5 in_transit
  ((select id from demo_user), (select id from org_shp),  (select id from donor_wf),
   'in_transit', now() - interval '1 hour',   now() + interval '30 minutes', now() - interval '30 minutes',
   'produce',    false, 45.00, 36, 'demo:in-transit',
   40.4624, -79.9144, 200),
  -- 6 in_transit (refrigerated)
  ((select id from demo_user), (select id from org_fr),  (select id from donor_ge),
   'in_transit', now() - interval '90 minutes', now() - interval '15 minutes', now() - interval '60 minutes',
   'refrigerated', true, 18.00, 14, 'demo:in-transit-cold-chain',
   40.4510, -79.9295, 250),
  -- 7 delivered, today
  ((select id from demo_user), (select id from org_eecm), (select id from donor_tj),
   'delivered', now() - interval '6 hours',  now() - interval '3 hours', now() - interval '5 hours',
   'dry_goods', false, 60.00, 50, 'demo:delivered-today',
   40.4624, -79.9144, 200),
  -- 8 delivered, today
  ((select id from demo_user), (select id from org_lol),  (select id from donor_wf),
   'delivered', now() - interval '5 hours',  now() - interval '2 hours', now() - interval '4 hours',
   'prepared',  false, 33.50, 27, 'demo:delivered-today-2',
   40.4624, -79.9144, 200),
  -- 9 delivered, today
  ((select id from demo_user), (select id from org_jh),  (select id from donor_ge),
   'delivered', now() - interval '4 hours',  now() - interval '1 hour',   now() - interval '3 hours',
   'produce',   false, 28.00, 22, 'demo:delivered-today-3',
   40.4510, -79.9295, 200),
  -- 10 expired (claim deadline passed without a claim)
  ((select id from demo_user), (select id from org_chs), (select id from donor_tj),
   'expired',  now() - interval '5 hours',  now() - interval '2 hours', now() - interval '1 hour',
   'prepared', false, 12.00, 9, 'demo:expired',
   40.4624, -79.9144, 200),
  -- 11 expired, refrigerated
  ((select id from demo_user), (select id from org_shp), (select id from donor_wf),
   'expired',  now() - interval '8 hours',  now() - interval '5 hours', now() - interval '4 hours',
   'refrigerated', true, 8.00, 6, 'demo:expired-cold-chain',
   40.4624, -79.9144, 250),
  -- 12 cancelled (donor withdrew before pickup)
  ((select id from demo_user), (select id from org_eecm), (select id from donor_ge),
   'cancelled', now() + interval '2 hours', now() + interval '5 hours', now() + interval '3 hours',
   'dry_goods', false, 0, 0, 'demo:cancelled',
   40.4510, -79.9295, 200),
  -- 13 cancelled (refrigerated)
  ((select id from demo_user), (select id from org_lol), (select id from donor_tj),
   'cancelled', now() + interval '1 hour', now() + interval '3 hours', now() + interval '2 hours',
   'refrigerated', true, 0, 0, 'demo:cancelled-2',
   40.4624, -79.9144, 250),
  -- 14 available, frozen
  ((select id from demo_user), (select id from org_jh), (select id from donor_wf),
   'available', now() + interval '45 minutes', now() + interval '3 hours', now() + interval '2 hours',
   'frozen',   true, 9.00, 7, 'demo:available-frozen',
   40.4624, -79.9144, 300),
  -- 15 claimed, dry goods
  ((select id from demo_user), (select id from org_fr), (select id from donor_ge),
   'claimed',  now() - interval '10 minutes', now() + interval '2 hours', now() + interval '90 minutes',
   'dry_goods', false, 42.00, 34, 'demo:claimed-dry-goods',
   40.4510, -79.9295, 200);

-- ============================================================
-- DONATION ITEMS for the demo donations (one row per donation, hand-set
-- so the AI-classify feature has something interesting to display).
-- ============================================================
insert into public.donation_items (donation_id, item_name, quantity, unit, estimated_pounds, estimated_meals, cold_chain, ai_generated, sort_order)
select id, 'Mixed bakery trays', 4, 'tray', 38.00, 30, false, true, 0
from public.donations where notes = 'demo:available-bakery';

insert into public.donation_items (donation_id, item_name, quantity, unit, estimated_pounds, estimated_meals, cold_chain, ai_generated, sort_order)
select id, 'Mixed produce', 22.5, 'lb', 22.50, 18, false, true, 0
from public.donations where notes = 'demo:available-produce';

insert into public.donation_items (donation_id, item_name, quantity, unit, estimated_pounds, estimated_meals, cold_chain, ai_generated, sort_order)
select id, 'Yogurt + cheese', 14.75, 'lb', 14.75, 11, true, true, 0
from public.donations where notes = 'demo:available-dairy';

insert into public.donation_items (donation_id, item_name, quantity, unit, estimated_pounds, estimated_meals, cold_chain, ai_generated, sort_order)
select id, 'Frozen prepared meals', 9, 'unit', 9.00, 7, true, true, 0
from public.donations where notes = 'demo:available-frozen';

-- ============================================================
-- HISTORICAL COMPLETIONS — deterministic ~90 delivered rows over 30 days.
-- Layout: 30 days × 3 slots/day = 90 rows.
-- Fixed seed (20260808) so the data is identical across re-runs.
-- Distribution: round-robin across recipient orgs and donors using modulo.
-- ============================================================
delete from public.donations where notes like 'hist:%';

with
  demo_user as (select id from public.profiles where email = 'admin@rescurerelay.demo'),
  recipients as (
    select id,
           row_number() over (order by slug) - 1 as rn
    from public.organizations
    where org_type in ('recipient', 'both')
  ),
  donor_pool as (
    select id,
           row_number() over (order by name) - 1 as rn,
           lat,
           lng
    from public.donors
    where active
  ),
  grid as (
    select
      gs.day_offset,
      gs2.slot,
      ((20260808 + gs.day_offset * 3 + gs2.slot * 7) % 12) as recipient_idx,
      ((20260808 + gs.day_offset * 5 + gs2.slot * 11) % 3) as donor_idx
    from generate_series(0, 29) as gs(day_offset)
    cross join generate_series(0, 2) as gs2(slot)
  )
insert into public.donations
  (posted_by, org_id, donor_id, status,
   pickup_window_start, pickup_window_end, claim_deadline,
   perishability, cold_chain_required,
   total_pounds, estimated_meals, notes,
   pickup_lat, pickup_lng, geofence_radius_m,
   created_at, updated_at)
select
  (select id from demo_user),
  r.id,
  d.id,
  'delivered'::public.donation_status,
  -- 2-hour window centered on the slot time, backdated
  (current_date - g.day_offset + time '10:00' + (g.slot || ' hours')::interval),
  (current_date - g.day_offset + time '12:00' + (g.slot || ' hours')::interval),
  (current_date - g.day_offset + time '09:00' + (g.slot || ' hours')::interval),
  (array['produce','refrigerated','dry_goods','prepared','frozen']::public.perishability[])
    [ ((20260808 + g.day_offset + g.slot) % 5) + 1 ],
  ((20260808 + g.day_offset + g.slot) % 4 = 0),
  -- 8–55 lb range, deterministic
  round((8 + ((20260808 + g.day_offset * 13 + g.slot * 7) % 48))::numeric, 2),
  -- 1–12 meals, deterministic
  1 + ((20260808 + g.day_offset * 11 + g.slot * 5) % 12),
  'hist:' || to_char(current_date - g.day_offset, 'YYYY-MM-DD') || '-' || g.slot,
  d.lat,
  d.lng,
  200,
  (current_date - g.day_offset + time '12:00' + (g.slot || ' hours')::interval),
  (current_date - g.day_offset + time '12:00' + (g.slot || ' hours')::interval)
from grid g
join lateral (select id from recipients where rn = g.recipient_idx limit 1) r on true
join lateral (select id, lat, lng from donor_pool where rn = g.donor_idx limit 1) d on true;

-- ============================================================
-- NOTIFICATIONS — small fan-out for the demo admin + drivers so the
-- notifications panel isn't empty on first load.
-- ============================================================
insert into public.notifications (user_id, notif_type, title, body, data)
select id, 'donation_posted', 'New donation available nearby',
       'A 38 lb bakery donation from Trader Joe''s East Liberty is open for claims.',
       jsonb_build_object('donation_notes', 'demo:available-bakery')
from public.profiles where email in ('admin@rescurerelay.demo', 'driver1@rescurerelay.demo', 'driver2@rescurerelay.demo');

insert into public.notifications (user_id, notif_type, title, body, data)
select id, 'pickup_reminder', 'Pickup window opens in 15 minutes',
       'Drive to 6343 Penn Ave to pick up the refrigerated dairy donation.',
       jsonb_build_object('donation_notes', 'demo:available-dairy')
from public.profiles where email in ('driver1@rescurerelay.demo', 'driver2@rescurerelay.demo');

insert into public.notifications (user_id, notif_type, title, body, data)
select id, 'delivery_complete', 'Delivery confirmed',
       'Your delivery to East End Cooperative Ministry was verified.',
       jsonb_build_object('donation_notes', 'demo:delivered-today')
from public.profiles where email = 'admin@rescurerelay.demo';

-- ============================================================
-- ACTIVITY LOG — first batch to anchor the timeline.
-- ============================================================
insert into public.activity_log (org_id, actor_id, action, entity_type, entity_id, metadata)
select o.id, p.id, 'post', 'donation', d.id, jsonb_build_object('notes', d.notes)
from public.donations d
join public.profiles p on p.id = d.posted_by
join public.organizations o on o.id = d.org_id
where d.notes like 'demo:%';
