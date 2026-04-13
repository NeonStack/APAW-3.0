create table if not exists public.pagasa_water_stations_cache (
	id bigserial primary key,
	cache_key text not null unique,
	stations_data jsonb not null default '[]'::jsonb,
	station_count integer not null default 0,
	cache_expiry_time timestamptz,
	last_attempt_at timestamptz not null default now(),
	last_success_at timestamptz,
	source text not null default 'pagasa_live',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create or replace function public.set_pagasa_water_stations_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists trg_pagasa_water_stations_cache_updated_at
on public.pagasa_water_stations_cache;

create trigger trg_pagasa_water_stations_cache_updated_at
before update on public.pagasa_water_stations_cache
for each row
execute function public.set_pagasa_water_stations_cache_updated_at();

create index if not exists idx_pagasa_water_stations_cache_expiry
on public.pagasa_water_stations_cache (cache_expiry_time);

insert into public.pagasa_water_stations_cache (cache_key)
values ('ACTIVE_PAGASA_WATER_STATIONS')
on conflict (cache_key) do nothing;
