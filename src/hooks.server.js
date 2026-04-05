import { error, redirect } from '@sveltejs/kit';
import { building } from '$app/environment';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { paramChecker } from '$lib/utils/api/paramChecker';

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_AUTH_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

const ALLOWED_ORIGIN = [
	'https://apawph.vercel.app',
	'http://localhost:5173',
	'https://apawph-development.vercel.app'
];
const EXCEPTIONS = ['/api/update-weather', '/api/automated-flood-detection'];
const CACHE_CONFIG = {
	'/api/get-weather': 'public, max-age=300, s-maxage=900',
	'/api/water-stations': 'public, max-age=300, s-maxage=540',
	'/api/tropicalCyclone-tracker': 'public, max-age=300, s-maxage=900',
	'/api/tropical-cyclone-warning': 'public, max-age=300, s-maxage=900',
	'/api/general-flood-advisory': 'public, max-age=300, s-maxage=900'
};
const API_PARAM_CONFIG = {
	'/api/get-weather': ['location'],
	'/api/water-stations': [],
	'/api/tropicalCyclone-tracker': []
};

let authClient;
function getAuthClient() {
	if (!authClient && SUPABASE_URL && SUPABASE_AUTH_KEY) {
		authClient = createClient(SUPABASE_URL, SUPABASE_AUTH_KEY, {
			auth: { persistSession: false, autoRefreshToken: false }
		});
	}
	return authClient;
}

async function isInternalSessionValid(token) {
	if (!token) return false;
	const client = getAuthClient();
	if (!client) return false;
	const { data, error: authError } = await client.auth.getUser(token);
	return !authError && !!data?.user;
}

export async function handle({ event, resolve }) {
	const pathname = event.url.pathname;

	if (pathname.startsWith('/internal')) {
		const session = event.cookies.get('internal_session');
		const isLoginPage = pathname === '/internal/login';
		const validSession = await isInternalSessionValid(session);

		if (!validSession && !isLoginPage) {
			throw redirect(303, '/internal/login');
		}
		if (validSession && isLoginPage) {
			throw redirect(303, '/internal/coordinates');
		}
	}

	if (pathname.startsWith('/api') && !EXCEPTIONS.includes(pathname)) {
		if (building) {
			return resolve(event);
		}

		const origin = event.request.headers.get('origin');
		const referer = event.request.headers.get('referer');
		const host = event.url.host;

		const isBadOrigin = origin && !ALLOWED_ORIGIN.includes(origin);
		const isDirectOrBadReferer = !origin && (!referer || !referer.includes(host));

		if (isBadOrigin || isDirectOrBadReferer) {
			console.warn(`Blocked API request. Origin: ${origin}, Referer: ${referer}`);
			throw error(404, 'Not Found');
		}

		const paramCheckerResponse = paramChecker(event.url, API_PARAM_CONFIG[pathname]);
		if (paramCheckerResponse !== null) {
			return paramCheckerResponse;
		}
	}

	const response = await resolve(event);
	const cacheControl = CACHE_CONFIG[pathname];
	if (cacheControl) {
		response.headers.set('Cache-Control', cacheControl);
	}
	return response;
}
