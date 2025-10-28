// src/hooks.server.js

import { json, error } from '@sveltejs/kit';
import { building } from '$app/environment';
import { paramChecker } from '$lib/utils/api/paramChecker';

const ALLOWED_ORIGIN = ['https://apawph.vercel.app', 'http://localhost:5173', 'https://apawph-development.vercel.app/'];
const EXCEPTIONS = ['/api/update-weather'];
const CACHED_API_ROUTES = ['/api/get-weather', '/api/water-stations'];
const API_PARAM_CONFIG = {
	'/api/get-weather': ['location'],
	'/api/water-stations': [],
	'/api/elevation': ['lat', 'lng'],
	'/api/flood-prediction': ['lat', 'lng', 'date', 'elevation', 'water_station_data'],
	'/api/tropicalCyclone-tracker': []
};

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

		const paramCheckerResponse = paramChecker(event.url, API_PARAM_CONFIG[event.url.pathname]);

		if (paramCheckerResponse !== null) {
			return paramCheckerResponse;
		}
	}

	const response = await resolve(event);

	if (CACHED_API_ROUTES.includes(event.url.pathname)) {
		response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=900');
	}

	return response;
}
