import { deserialize } from '$app/forms';

function buildActionError(result, fallbackMessage) {
	const message =
		result?.data?.message ||
		result?.data?.error ||
		result?.error?.message ||
		fallbackMessage ||
		'Predict action failed';

	const error = new Error(message);
	error.details = result?.data || null;
	error.status = result?.status || null;
	return error;
}

export async function callPredictPageAction(actionName, payload = {}) {
	const formData = new FormData();
	formData.set('payload', JSON.stringify(payload ?? {}));

	const response = await fetch(`?/${actionName}`, {
		method: 'POST',
		headers: {
			'x-sveltekit-action': 'true'
		},
		body: formData
	});

	const rawText = await response.text();
	const result = deserialize(rawText);

	if (result?.type === 'success') {
		return result.data;
	}

	if (result?.type === 'redirect') {
		throw buildActionError(result, 'Unexpected redirect from predict action');
	}

	if (result?.type === 'failure') {
		throw buildActionError(result, `Predict action failed (${result.status || response.status})`);
	}

	if (result?.type === 'error') {
		throw buildActionError(result, 'Predict action returned an error');
	}

	throw new Error('Unexpected action response format');
}
