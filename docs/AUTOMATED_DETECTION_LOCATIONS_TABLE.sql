create table if not exists public.automated_detection_locations (
id bigserial primary key,
coordinate_id text not null unique,
location_name text not null,
latitude double precision not null,
longitude double precision not null,
is_active boolean not null default true,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);

create or replace function public.set_automated_detection_locations_updated_at()
returns trigger
language plpgsql
as $$
begin
new.updated_at = now();
return new;
end;
$$;

drop trigger if exists trg_automated_detection_locations_updated_at on public.automated_detection_locations;
create trigger trg_automated_detection_locations_updated_at
before update on public.automated_detection_locations
for each row
execute function public.set_automated_detection_locations_updated_at();

create index if not exists idx_automated_detection_locations_active
on public.automated_detection_locations (is_active, location_name);
