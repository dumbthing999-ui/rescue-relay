-- Rescue Relay Supabase Schema
-- Modeled on /root/clearbooks/lib/schema.sql pattern
-- Run in Supabase SQL editor (or psql) once.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('org_staff', 'org_admin', 'driver', 'admin');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'org_type') then
    create type public.org_type as enum ('recipient', 'donor', 'both');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'membership_role') then
    create type public.membership_role as enum ('admin', 'staff', 'driver');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'donation_status') then
    create type public.donation_status as enum ('available', 'claimed', 'in_transit', 'delivered', 'expired', 'cancelled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'perishability') then
    create type public.perishability as enum ('dry_goods', 'produce', 'refrigerated', 'frozen', 'prepared');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'claim_status') then
    create type public.claim_status as enum ('active', 'completed', 'cancelled', 'expired');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'trip_status') then
    create type public.trip_status as enum ('planned', 'in_progress', 'completed', 'cancelled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'checkin_type') then
    create type public.checkin_type as enum ('pickup', 'delivery');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'notif_type') then
    create type public.notif_type as enum (
      'donation_posted', 'donation_claimed', 'pickup_reminder', 'claim_expiring', 'delivery_complete'
    );
  end if;
end $$;

-- ============================================
-- UPDATED_AT TRIGGER HELPER
-- ============================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ============================================
-- TABLES
-- ============================================
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    full_name text,
    role public.user_role not null default 'driver',
    avatar_url text,
    home_lat numeric(9, 6),
    home_lng numeric(9, 6),
    notify_radius_m int not null default 5000,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.neighborhoods (
    name text primary key,
    lat numeric(9, 6),
    lng numeric(9, 6)
);

create table public.organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    slug text not null unique,
    org_type public.org_type,
    address text,
    neighborhood text,
    contact_name text,
    contact_email text,
    phone text,
    lat numeric(9, 6),
    lng numeric(9, 6),
    verified bool not null default false,
    pilot_partner bool not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.memberships (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    org_id uuid not null references public.organizations(id) on delete cascade,
    role public.membership_role not null default 'staff',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, org_id)
);

create table public.donors (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    donor_type text,
    organization_id uuid references public.organizations(id),
    address text,
    neighborhood text,
    contact_name text,
    contact_phone text,
    lat numeric(9, 6),
    lng numeric(9, 6),
    active bool not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.donations (
    id uuid primary key default uuid_generate_v4(),
    posted_by uuid references public.profiles(id),
    org_id uuid not null references public.organizations(id),
    donor_id uuid references public.donors(id),
    status public.donation_status not null default 'available',
    pickup_window_start timestamptz,
    pickup_window_end timestamptz,
    claim_deadline timestamptz,
    perishability public.perishability,
    cold_chain_required bool not null default false,
    cold_chain_verified bool,
    pickup_lat numeric(9, 6),
    pickup_lng numeric(9, 6),
    geofence_radius_m int not null default 200,
    total_pounds numeric(10, 2),
    estimated_meals int,
    notes text,
    photo_urls jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.donation_items (
    id uuid primary key default uuid_generate_v4(),
    donation_id uuid not null references public.donations(id) on delete cascade,
    item_name text not null,
    quantity numeric(10, 2) not null default 1,
    unit text not null default 'count',
    estimated_pounds numeric(10, 2),
    estimated_meals int,
    cold_chain bool,
    ai_generated bool not null default false,
    sort_order int not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.trips (
    id uuid primary key default uuid_generate_v4(),
    driver_id uuid references public.profiles(id),
    org_id uuid references public.organizations(id),
    status public.trip_status not null default 'planned',
    planned_at timestamptz not null default now(),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.claims (
    id uuid primary key default uuid_generate_v4(),
    donation_id uuid not null references public.donations(id),
    claimed_by uuid not null references public.profiles(id),
    org_id uuid not null references public.organizations(id),
    status public.claim_status not null default 'active',
    trip_id uuid references public.trips(id),
    route_order int,
    claimed_at timestamptz not null default now(),
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.check_ins (
    id uuid primary key default uuid_generate_v4(),
    claim_id uuid not null references public.claims(id),
    trip_id uuid references public.trips(id),
    driver_id uuid references public.profiles(id),
    checkin_type public.checkin_type not null,
    lat numeric(9, 6),
    lng numeric(9, 6),
    within_geofence bool,
    verified_at timestamptz not null default now()
);

create table public.notifications (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    notif_type public.notif_type not null,
    title text,
    body text,
    data jsonb,
    read bool not null default false,
    created_at timestamptz not null default now()
);

create table public.activity_log (
    id uuid primary key default uuid_generate_v4(),
    org_id uuid references public.organizations(id),
    actor_id uuid references public.profiles(id),
    action text,
    entity_type text,
    entity_id uuid,
    metadata jsonb,
    created_at timestamptz not null default now()
);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
create trigger profiles_updated_at before update on public.profiles
    for each row execute function public.handle_updated_at();
create trigger organizations_updated_at before update on public.organizations
    for each row execute function public.handle_updated_at();
create trigger memberships_updated_at before update on public.memberships
    for each row execute function public.handle_updated_at();
create trigger donors_updated_at before update on public.donors
    for each row execute function public.handle_updated_at();
create trigger donations_updated_at before update on public.donations
    for each row execute function public.handle_updated_at();
create trigger donation_items_updated_at before update on public.donation_items
    for each row execute function public.handle_updated_at();
create trigger trips_updated_at before update on public.trips
    for each row execute function public.handle_updated_at();
create trigger claims_updated_at before update on public.claims
    for each row execute function public.handle_updated_at();

-- ============================================
-- INDEXES
-- ============================================
create index idx_donations_status on public.donations(status);
create index idx_donations_status_deadline on public.donations(status, claim_deadline);
create index idx_claims_claimed_by_status on public.claims(claimed_by, status);
create index idx_trips_driver_status on public.trips(driver_id, status);
create index idx_check_ins_claim on public.check_ins(claim_id);
create index idx_notifications_user_read on public.notifications(user_id, read);

-- One active claim per donation (enforced by claim_donation RPC as well)
create unique index claims_one_active_per_donation on public.claims(donation_id) where status = 'active';

-- ============================================
-- RLS HELPER FUNCTIONS
-- ============================================
create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  );
$$;

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
  );
$$;

grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.donors enable row level security;
alter table public.donations enable row level security;
alter table public.donation_items enable row level security;
alter table public.trips enable row level security;
alter table public.claims enable row level security;
alter table public.check_ins enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_log enable row level security;

-- profiles
create policy "profiles_select_authenticated" on public.profiles
    for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles
    for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
    for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- neighborhoods
create policy "neighborhoods_select_all" on public.neighborhoods
    for select to anon, authenticated using (true);

-- organizations
create policy "organizations_select_all" on public.organizations
    for select to anon, authenticated using (true);
create policy "organizations_insert_authenticated" on public.organizations
    for insert to authenticated with check (true);
create policy "organizations_update_admin" on public.organizations
    for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));
create policy "organizations_delete_admin" on public.organizations
    for delete to authenticated using (public.is_org_admin(id));

-- memberships
create policy "memberships_select_own_or_admin" on public.memberships
    for select to authenticated using (user_id = auth.uid() or public.is_org_admin(org_id));
create policy "memberships_insert_own" on public.memberships
    for insert to authenticated with check (user_id = auth.uid());
create policy "memberships_update_admin" on public.memberships
    for update to authenticated using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
create policy "memberships_delete_own_or_admin" on public.memberships
    for delete to authenticated using (user_id = auth.uid() or public.is_org_admin(org_id));

-- donors (anon access via donors_public view only — contact_phone is never exposed)
create policy "donors_select_authenticated" on public.donors
    for select to authenticated using (true);
create policy "donors_insert_member" on public.donors
    for insert to authenticated with check (public.is_org_member(organization_id));
create policy "donors_update_member" on public.donors
    for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "donors_delete_admin" on public.donors
    for delete to authenticated using (public.is_org_admin(organization_id));

-- donations
create policy "donations_select_anon_public" on public.donations
    for select to anon using (status in ('available', 'delivered'));
create policy "donations_select_authenticated" on public.donations
    for select to authenticated using (
        status in ('available', 'delivered')
        or public.is_org_member(org_id)
        or posted_by = auth.uid()
        or exists (
            select 1 from public.claims c
            where c.donation_id = id and c.claimed_by = auth.uid()
        )
    );
create policy "donations_insert_org" on public.donations
    for insert to authenticated with check (
        public.is_org_member(org_id) and posted_by = auth.uid()
    );
create policy "donations_update_org_or_driver" on public.donations
    for update to authenticated using (
        public.is_org_member(org_id)
        or exists (
            select 1 from public.claims c
            where c.donation_id = id and c.claimed_by = auth.uid()
        )
    );
create policy "donations_delete_admin" on public.donations
    for delete to authenticated using (public.is_org_admin(org_id));

-- donation_items
create policy "donation_items_select_anon_public" on public.donation_items
    for select to anon using (
        exists (
            select 1 from public.donations d
            where d.id = donation_id and d.status in ('available', 'delivered')
        )
    );
create policy "donation_items_select_authenticated" on public.donation_items
    for select to authenticated using (
        exists (
            select 1 from public.donations d
            where d.id = donation_id
              and (d.status in ('available', 'delivered') or public.is_org_member(d.org_id) or d.posted_by = auth.uid())
        )
    );
create policy "donation_items_insert_org" on public.donation_items
    for insert to authenticated with check (
        exists (
            select 1 from public.donations d
            where d.id = donation_id and public.is_org_member(d.org_id)
        )
    );
create policy "donation_items_update_org" on public.donation_items
    for update to authenticated using (
        exists (
            select 1 from public.donations d
            where d.id = donation_id and public.is_org_member(d.org_id)
        )
    );
create policy "donation_items_delete_org" on public.donation_items
    for delete to authenticated using (
        exists (
            select 1 from public.donations d
            where d.id = donation_id and public.is_org_member(d.org_id)
        )
    );

-- trips
create policy "trips_select_driver_or_member" on public.trips
    for select to authenticated using (driver_id = auth.uid() or public.is_org_member(org_id));
create policy "trips_insert_driver" on public.trips
    for insert to authenticated with check (driver_id = auth.uid());
create policy "trips_update_driver" on public.trips
    for update to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());

-- claims (no INSERT grant — claims are created only via claim_donation RPC)
create policy "claims_select_driver_or_member" on public.claims
    for select to authenticated using (claimed_by = auth.uid() or public.is_org_member(org_id));
create policy "claims_update_driver_or_admin" on public.claims
    for update to authenticated using (claimed_by = auth.uid() or public.is_org_admin(org_id));

revoke insert on public.claims from anon, authenticated;

-- check_ins (insert only via check_in RPC)
create policy "check_ins_select_driver_or_member" on public.check_ins
    for select to authenticated using (
        exists (
            select 1 from public.claims c
            where c.id = claim_id
              and (c.claimed_by = auth.uid() or public.is_org_member(c.org_id))
        )
    );

-- notifications
create policy "notifications_select_own" on public.notifications
    for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- activity_log (insert only via RPCs)
create policy "activity_log_select_member_or_actor" on public.activity_log
    for select to authenticated using (actor_id = auth.uid() or public.is_org_member(org_id));

-- ============================================
-- ATOMIC CLAIM RPC + RELATED FUNCTIONS
-- ============================================
create or replace function public.claim_donation(p_donation_id uuid, p_driver_id uuid)
returns jsonb
language plpgsql security definer
as $$
declare
  v_donation public.donations%rowtype;
  v_claim_id uuid;
  v_same_org boolean;
begin
  select * into v_donation
    from public.donations
    where id = p_donation_id and status = 'available'
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'already_claimed_or_unavailable');
  end if;

  if now() > v_donation.claim_deadline then
    update public.donations set status = 'expired' where id = p_donation_id;
    return jsonb_build_object('ok', false, 'error', 'claim_window_closed');
  end if;

  select exists (
    select 1 from public.memberships m
    where m.user_id = p_driver_id and m.org_id = v_donation.org_id
  ) into v_same_org;

  if v_same_org then
    return jsonb_build_object('ok', false, 'error', 'cannot_claim_own');
  end if;

  insert into public.claims (donation_id, claimed_by, org_id)
  values (p_donation_id, p_driver_id, v_donation.org_id)
  returning id into v_claim_id;

  update public.donations set status = 'claimed' where id = p_donation_id;

  insert into public.activity_log (org_id, actor_id, action, entity_type, entity_id)
  values (v_donation.org_id, p_driver_id, 'claim', 'donation', p_donation_id);

  return jsonb_build_object(
    'ok', true,
    'claim_id', v_claim_id,
    'donation_id', p_donation_id,
    'driver_id', p_driver_id
  );
end;
$$;

create or replace function public.release_claim(p_claim_id uuid, p_driver_id uuid)
returns jsonb
language plpgsql security definer
as $$
declare
  v_donation_id uuid;
  v_org_id uuid;
  v_status public.claim_status;
begin
  select donation_id, org_id, status into v_donation_id, v_org_id, v_status
    from public.claims
    where id = p_claim_id and claimed_by = p_driver_id
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'claim_not_found');
  end if;

  if v_status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'claim_not_active');
  end if;

  update public.claims set status = 'cancelled' where id = p_claim_id;
  update public.donations set status = 'available' where id = v_donation_id;

  insert into public.activity_log (org_id, actor_id, action, entity_type, entity_id)
  values (v_org_id, p_driver_id, 'release', 'claim', p_claim_id);

  return jsonb_build_object('ok', true, 'claim_id', p_claim_id, 'donation_id', v_donation_id);
end;
$$;

create or replace function public.check_in(
  p_claim_id uuid,
  p_checkin_type public.checkin_type,
  p_lat numeric,
  p_lng numeric,
  p_within_geofence bool
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_trip_id uuid;
  v_org_id uuid;
  v_authorized boolean;
begin
  select exists (
    select 1 from public.claims c
    where c.id = p_claim_id
      and (
        c.claimed_by = auth.uid()
        or exists (
          select 1 from public.trips t
          where t.id = c.trip_id and t.driver_id = auth.uid()
        )
      )
  ) into v_authorized;

  if not v_authorized then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  select trip_id, org_id into v_trip_id, v_org_id
    from public.claims where id = p_claim_id;

  insert into public.check_ins (claim_id, trip_id, driver_id, checkin_type, lat, lng, within_geofence)
  values (p_claim_id, v_trip_id, auth.uid(), p_checkin_type, p_lat, p_lng, p_within_geofence);

  insert into public.activity_log (org_id, actor_id, action, entity_type, entity_id)
  values (v_org_id, auth.uid(), p_checkin_type::text, 'claim', p_claim_id);

  return jsonb_build_object(
    'ok', true,
    'claim_id', p_claim_id,
    'checkin_type', p_checkin_type,
    'within_geofence', p_within_geofence
  );
end;
$$;

create or replace function public.complete_trip(p_trip_id uuid, p_driver_id uuid)
returns jsonb
language plpgsql security definer
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id
    from public.trips
    where id = p_trip_id and driver_id = p_driver_id
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'trip_not_found');
  end if;

  update public.trips set status = 'completed', completed_at = now()
    where id = p_trip_id;

  update public.claims set status = 'completed', completed_at = now()
    where trip_id = p_trip_id and status = 'active';

  update public.donations d set status = 'delivered'
    from public.claims c
    where c.trip_id = p_trip_id
      and c.donation_id = d.id
      and d.status = 'claimed';

  insert into public.activity_log (org_id, actor_id, action, entity_type, entity_id)
  values (v_org_id, p_driver_id, 'complete_trip', 'trip', p_trip_id);

  return jsonb_build_object('ok', true, 'trip_id', p_trip_id);
end;
$$;

create or replace function public.impact_aggregates()
returns jsonb
language sql security definer stable
as $$
  select jsonb_build_object(
    'total_lbs', coalesce(sum(total_pounds), 0),
    'total_meals', coalesce(sum(estimated_meals), 0),
    'total_rescues', count(*)
  )
  from public.donations
  where status = 'delivered';
$$;

grant execute on function public.claim_donation(uuid, uuid) to authenticated;
grant execute on function public.release_claim(uuid, uuid) to authenticated;
grant execute on function public.check_in(uuid, public.checkin_type, numeric, numeric, boolean) to authenticated;
grant execute on function public.complete_trip(uuid, uuid) to authenticated;
grant execute on function public.impact_aggregates() to anon, authenticated;

-- ============================================
-- PUBLIC VIEWS
-- ============================================
-- Anon-safe donor info: no contact_phone
create or replace view public.donors_public as
select id, name, donor_type, organization_id, neighborhood, lat, lng
from public.donors
where active = true;

grant select on public.donors_public to anon, authenticated;

-- Per-day rescue impact rollup
create or replace view public.impact_summary as
select
  date(d.updated_at) as day,
  d.org_id,
  o.neighborhood,
  d.donor_id,
  sum(d.total_pounds) as lbs,
  sum(d.estimated_meals) as meals,
  count(*) as rescues
from public.donations d
join public.organizations o on o.id = d.org_id
where d.status = 'delivered'
group by 1, 2, 3, 4;

grant select on public.impact_summary to anon, authenticated;

-- Anon only reaches donations/donors through the curated views and RLS policies.
revoke all on public.donations from anon;
revoke all on public.donors from anon;
grant select on public.donations to anon;  -- anon listing gated by RLS status filter

-- ============================================
-- STORAGE: DONATION PHOTOS
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'donation-photos', 'donation-photos', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Folder convention: {org_id}/{donation_id}/photo.jpg
create policy "donation_photos_org_admin_insert" on storage.objects
    for insert to authenticated with check (
        bucket_id = 'donation-photos'
        and (storage.foldername(name))[1] <> ''
        and public.is_org_admin(((storage.foldername(name))[1])::uuid)
    );
create policy "donation_photos_org_admin_select" on storage.objects
    for select to authenticated using (
        bucket_id = 'donation-photos'
        and (storage.foldername(name))[1] <> ''
        and public.is_org_admin(((storage.foldername(name))[1])::uuid)
    );
create policy "donation_photos_driver_select" on storage.objects
    for select to authenticated using (
        bucket_id = 'donation-photos'
        and (storage.foldername(name))[1] <> ''
        and exists (
            select 1 from public.claims c
            where c.donation_id = ((storage.foldername(name))[1])::uuid
              and c.claimed_by = auth.uid()
        )
    );
create policy "donation_photos_org_admin_delete" on storage.objects
    for delete to authenticated using (
        bucket_id = 'donation-photos'
        and (storage.foldername(name))[1] <> ''
        and public.is_org_admin(((storage.foldername(name))[1])::uuid)
    );
