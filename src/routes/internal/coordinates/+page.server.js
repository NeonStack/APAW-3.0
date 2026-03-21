import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/private';

const TABLE = 'automated_detection_locations';

function getDb() {
	return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}

export async function load() {
	const supabase = getDb();
	const { data, error } = await supabase
		.from(TABLE)
		.select('id, coordinate_id, location_name, latitude, longitude, is_active, created_at')
		.order('location_name', { ascending: true });

	if (error) {
		return { rows: [], loadError: error.message };
	}

	return { rows: data ?? [], loadError: null };
}

export const actions = {
	add: async ({ request }) => {
		const form = await request.formData();
		const coordinateId = String(form.get('coordinate_id') ?? '').trim();
		const locationName = String(form.get('location_name') ?? '').trim();
		const latitude = Number(form.get('latitude'));
		const longitude = Number(form.get('longitude'));

		if (
			!coordinateId ||
			!locationName ||
			!Number.isFinite(latitude) ||
			!Number.isFinite(longitude)
		) {
			return fail(400, {
				addError: 'Please provide valid coordinate_id, location_name, lat, and lon.'
			});
		}

		const supabase = getDb();
		const { error } = await supabase.from(TABLE).upsert(
			{
				coordinate_id: coordinateId,
				location_name: locationName,
				latitude,
				longitude,
				is_active: true
			},
			{ onConflict: 'coordinate_id' }
		);

		if (error) {
			return fail(500, { addError: error.message });
		}

		return { addSuccess: true };
	},

	remove: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isFinite(id)) {
			return fail(400, { removeError: 'Invalid row id.' });
		}

		const supabase = getDb();
		const { error } = await supabase.from(TABLE).delete().eq('id', id);
		if (error) {
			return fail(500, { removeError: error.message });
		}

		return { removeSuccess: true };
	}
};
