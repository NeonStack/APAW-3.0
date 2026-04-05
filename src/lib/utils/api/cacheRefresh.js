export async function readCacheStatus(supabase, tableName) {
	const { data: cacheStatus } = await supabase
		.from(tableName)
		.select('cache_expiry_time')
		.limit(1)
		.single();

	return cacheStatus || null;
}

export function isCacheExpired(cacheStatus, now = new Date()) {
	return !cacheStatus || new Date(cacheStatus.cache_expiry_time) < now;
}

export async function triggerBackgroundTask(platform, taskPromise) {
	if (platform?.context?.waitUntil) {
		platform.context.waitUntil(taskPromise);
		return;
	}

	await taskPromise;
}

export async function replaceCacheRows(supabase, tableName, rows) {
	const normalizedRows = Array.isArray(rows) ? rows : [rows];

	await supabase.from(tableName).delete().neq('id', -1);
	if (normalizedRows.length > 0) {
		await supabase.from(tableName).insert(normalizedRows);
	}
}
