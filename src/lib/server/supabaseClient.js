import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/private';

let supabaseServiceClient = null;

export function getSupabaseServiceClient() {
	if (!supabaseServiceClient) {
		supabaseServiceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
	}

	return supabaseServiceClient;
}
