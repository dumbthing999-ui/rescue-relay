-- Rescue Relay seed — minimal inserts
-- 12 Pittsburgh recipients + 3 donors

insert into organizations (name, slug, org_type) values
  ('Pittsburgh Community Food Bank', 'pittsburgh-food-bank', 'recipient'),
  ('Allegheny Free Health Clinic', 'allegheny-free-clinic', 'recipient'),
  ('Bethlehem Haven Shelter', 'bethlehem-haven', 'recipient'),
  ('Steel City Community Center', 'steel-city-center', 'recipient'),
  ('North Side Food Pantry', 'north-side-pantry', 'recipient'),
  ('Hill District Outreach', 'hill-district-outreach', 'recipient'),
  ('East Liberty Soup Kitchen', 'east-liberty-soup', 'recipient'),
  ('South Hills Youth Services', 'south-hills-youth', 'recipient'),
  ('Oakland Neighborhood Alliance', 'oakland-alliance', 'recipient'),
  ('Garfield Community Hub', 'garfield-hub', 'recipient'),
  ('Lawrenceville Family Support', 'lawrenceville-family', 'recipient'),
  ('Bloomfield Wellness Center', 'bloomfield-wellness', 'recipient')
on conflict (slug) do nothing;

insert into organizations (name, slug, org_type) values
  ('Steel City Foundation', 'steel-city-foundation', 'donor'),
  ('Three Rivers Trust', 'three-rivers-trust', 'donor'),
  ('Monongahela Mutual', 'monongahela-mutual', 'donor')
on conflict (slug) do nothing;

-- Minimal recipient inserts mapping to key Pittsburgh names per request
insert into recipients (name, category, need_category) values
  ('Pittsburgh Community Food Bank', 'food_bank', 'food'),
  ('Allegheny Free Health Clinic', 'health', 'medical'),
  ('Bethlehem Haven Shelter', 'shelter', 'housing'),
  ('Steel City Foundation', 'foundation', 'funding'),
  ('Three Rivers Trust', 'trust', 'funding'),
  ('Monongahela Mutual', 'mutual', 'funding');
on conflict (name) do nothing;
