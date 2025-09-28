import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/private';

export async function GET({ request }) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get current date in Manila timezone
  const today = new Date('2025-09-28T00:00:00Z'); // Start of Sep 28 UTC
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 5); // Up to Oct 3

  // List of all location names
  const locations = [
    'Manila',
    'Mandaluyong',
    'Marikina',
    'Pasig',
    'Quezon City',
    'San Juan',
    'Caloocan (North)',
    'Caloocan (South)',
    'Malabon',
    'Navotas',
    'Valenzuela',
    'Las Piñas',
    'Makati',
    'Muntinlupa',
    'Parañaque',
    'Pasay',
    'Pateros',
    'Taguig'
  ];

  // Query the table
  const { data, error } = await supabase
    .from('hourly_weather_forecasts')
    .select('*')
    .in('location_name', locations)
    .gte('datetime', today.toISOString().split('T')[0])
    .lt('datetime', endDate.toISOString().split('T')[0])
    .order('location_name', { ascending: true })
    .order('datetime', { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}