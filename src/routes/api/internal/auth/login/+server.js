import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_AUTH_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

export async function POST({ request, cookies }) {
	let body = {};
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body.' }, { status: 400 });
	}

	const email = String(body.email ?? '').trim();
	const password = String(body.password ?? '');

	if (!email || !password) {
		return json({ error: 'Email and password are required.' }, { status: 400 });
	}

	if (!SUPABASE_URL || !SUPABASE_AUTH_KEY) {
		return json(
			{ error: 'Server configuration missing SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY).' },
			{ status: 500 }
		);
	}

	const supabase = createClient(SUPABASE_URL, SUPABASE_AUTH_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	const { data, error } = await supabase.auth.signInWithPassword({ email, password });
	if (error || !data?.session?.access_token) {
		return json({ error: error?.message ?? 'Login failed.' }, { status: 401 });
	}

	cookies.set('internal_session', data.session.access_token, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 8
	});

	return json({ success: true });
}
