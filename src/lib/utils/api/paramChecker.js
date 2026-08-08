import { error } from '@sveltejs/kit';

export function paramChecker(url, allowedParams = []) {
	if (allowedParams === undefined) {
		return null;
	}

	for (const key of url.searchParams.keys()) {
		if (!allowedParams.includes(key)) {
			throw error(404, 'Not Found');
		}
	}

	return null;
}
