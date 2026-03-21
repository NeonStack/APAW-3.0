import { json } from '@sveltejs/kit';

export async function POST({ cookies }) {
	cookies.delete('internal_session', { path: '/' });
	return json({ success: true });
}
