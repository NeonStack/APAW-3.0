create table if not exists public.automated_flood_detection (
  id bigserial primary key,
  run_id uuid not null,
  triggered_at timestamptz not null,
  trigger_source text not null,
  coordinate_id text not null,
  location_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  request_date date not null,
  forecast_date date not null,
  forecast_index integer not null,
  risk_level text,
  flood_probability double precision,
  forecast_payload jsonb not null,
  model_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists automated_flood_detection_uq
  on public.automated_flood_detection (coordinate_id, forecast_date, request_date);

create index if not exists automated_flood_detection_run_idx
  on public.automated_flood_detection (run_id);

create index if not exists automated_flood_detection_request_date_idx
  on public.automated_flood_detection (request_date);

create or replace function public.set_automated_flood_detection_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_automated_flood_detection_updated_at on public.automated_flood_detection;

create trigger trg_automated_flood_detection_updated_at
before update on public.automated_flood_detection
for each row
execute function public.set_automated_flood_detection_updated_at();
