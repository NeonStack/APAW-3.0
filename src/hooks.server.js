// src/hooks.server.js

import { json, error } from '@sveltejs/kit';
import { building } from '$app/environment';

const ALLOWED_ORIGIN = ['https://apawph.vercel.app', 'http://localhost:5173'];
const EXCEPTIONS = ['/api/update-weather'];

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	if (event.url.pathname.startsWith('/api') && !EXCEPTIONS.includes(event.url.pathname)) {
		if (building) {
			return resolve(event);
		}

		const origin = event.request.headers.get('origin');
		const referer = event.request.headers.get('referer');
		const host = event.url.host;

		// A. Block requests from unauthorized websites (cross-origin)
		const isBadOrigin = origin && !ALLOWED_ORIGIN.includes(origin);

		// B. Block direct access attempts that are NOT from our own site.
		// This checks if a request has no origin/referer OR a referer from a different site.
		const isDirectOrBadReferer = !origin && (!referer || !referer.includes(host));

		if (isBadOrigin || isDirectOrBadReferer) {
			console.warn(`Blocked API request. Origin: ${origin}, Referer: ${referer}`);
			throw error(404, 'Not Found');
		}
	}

	return resolve(event);
}
