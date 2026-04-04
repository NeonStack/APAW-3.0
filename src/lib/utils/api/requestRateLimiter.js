const requestRateBuckets = new Map();

export function formatRetryDelay(retryAfterSeconds) {
	const totalSeconds = Math.max(1, Math.ceil(Number(retryAfterSeconds) || 0));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;

	if (minutes <= 0) {
		return `${seconds} second${seconds === 1 ? '' : 's'}`;
	}

	if (seconds === 0) {
		return `${minutes} minute${minutes === 1 ? '' : 's'}`;
	}

	return `${minutes} minute${minutes === 1 ? '' : 's'} ${seconds} second${seconds === 1 ? '' : 's'}`;
}

function resolveClientAddress(request, getClientAddress) {
	if (typeof getClientAddress === 'function') {
		try {
			const address = getClientAddress();
			if (typeof address === 'string' && address.trim()) {
				return address.trim();
			}
		} catch {
			// Ignore and fallback to request headers.
		}
	}

	const forwardedFor = request.headers.get('x-forwarded-for');
	if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
		return forwardedFor.split(',')[0].trim();
	}

	const realIp = request.headers.get('x-real-ip');
	if (typeof realIp === 'string' && realIp.trim()) {
		return realIp.trim();
	}

	return 'unknown_client';
}

function pruneExpiredBuckets(now) {
	if (requestRateBuckets.size < 2000) return;

	for (const [key, bucket] of requestRateBuckets.entries()) {
		if (!bucket || now > bucket.resetAt) {
			requestRateBuckets.delete(key);
		}
	}
}

export function consumeRequestRateLimit({
	request,
	getClientAddress,
	scope,
	maxRequests = 10,
	windowMs = 60 * 1000,
	now = Date.now()
}) {
	if (!scope) {
		throw new Error('Rate limit scope is required.');
	}

	pruneExpiredBuckets(now);

	const clientAddress = resolveClientAddress(request, getClientAddress);
	const key = `${scope}:${clientAddress}`;
	const existingBucket = requestRateBuckets.get(key);

	let bucket = existingBucket;
	if (!bucket || now > bucket.resetAt) {
		bucket = { count: 0, resetAt: now + windowMs };
	}

	bucket.count += 1;
	requestRateBuckets.set(key, bucket);

	const allowed = bucket.count <= maxRequests;
	const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

	return {
		allowed,
		retryAfterSeconds,
		remainingRequests: Math.max(0, maxRequests - bucket.count),
		maxRequests,
		windowMs
	};
}