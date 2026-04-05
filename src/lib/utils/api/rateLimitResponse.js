import { json } from '@sveltejs/kit';
import { formatRetryDelay } from '$lib/utils/api/requestRateLimiter.js';

export function createRateLimitResponse(rateLimitVerdict) {
	const retryAfterHuman = formatRetryDelay(rateLimitVerdict.retryAfterSeconds);
	const retryAfterMinutes = Math.max(1, Math.ceil(rateLimitVerdict.retryAfterSeconds / 60));

	return json(
		{
			error: `Too many requests. Please try again in ${retryAfterHuman}.`,
			retry_after_seconds: rateLimitVerdict.retryAfterSeconds,
			retry_after_minutes: retryAfterMinutes,
			retry_after_human: retryAfterHuman
		},
		{
			status: 429,
			headers: {
				'retry-after': String(rateLimitVerdict.retryAfterSeconds)
			}
		}
	);
}
