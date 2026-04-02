import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import {
	buildPredictionDigest,
	buildDeterministicPawiSummary
} from '$lib/utils/predictionDigest.js';

const CONFIG = {
	REQUEST_TIMEOUT_MS: 60000,
	CHAR_BUDGET: 12000,
	MAX_SUMMARY_CHARS: 1200,
	GROQ_MODEL: 'meta-llama/llama-4-scout-17b-16e-instruct'
};

function elapsedMs(start) {
	return (performance.now() - start).toFixed(2);
}

function timingLog(stage, start, extra = '') {
	const suffix = extra ? ` | ${extra}` : '';
	console.log(`⏱️ [pawi] ${stage}_ms=${elapsedMs(start)}${suffix}`);
}

function validateSummaryShape(candidate) {
	if (!candidate || typeof candidate !== 'object') return false;

	const text =
		typeof candidate.summary === 'string'
			? candidate.summary
			: typeof candidate.overall_summary === 'string'
				? candidate.overall_summary
				: '';

	if (!text || text.trim().length === 0 || text.length > CONFIG.MAX_SUMMARY_CHARS) return false;

	return true;
}

function getDigestMaxChancePct(digest) {
	const days = Array.isArray(digest?.days) ? digest.days : [];
	let maxProbability = 0;

	for (const day of days) {
		const p = Number(day?.max_probability ?? 0);
		if (Number.isFinite(p) && p > maxProbability) maxProbability = p;
	}

	return Math.max(0, maxProbability * 100);
}

function formatChancePct(value) {
	if (!Number.isFinite(value) || value <= 0) return '0%';
	if (value < 1) return `${value.toFixed(2)}%`;
	return `${value.toFixed(1)}%`;
}

function stylizePawiSummary(text = '', digest = null) {
	let cleaned = String(text || '')
		.replace(/^\s*here is (a )?summary[^:]*:\s*/i, '')
		.replace(/^\s*summary\s*:\s*/i, '')
		.replace(/\s+/g, ' ')
		.trim();

	if (!cleaned) return cleaned;

	// Normalize malformed double-percent strings.
	cleaned = cleaned.replace(/%{2,}/g, '%');

	// Convert raw decimal probabilities in chance/probability phrases into user-friendly percentages,
	// but only if the decimal is NOT already followed by a percent sign.
	cleaned = cleaned.replace(
		/(chance|probability)([^0-9%]{0,20})(0\.\d+)(?!\s*%)/gi,
		(match, keyword, between, value) => {
			const n = Number(value);
			if (!Number.isFinite(n)) return match;
			const pct = n * 100;
			const pctText = pct >= 1 ? `${pct.toFixed(1)}%` : `${pct.toFixed(2)}%`;
			return `${keyword}${between}${pctText}`;
		}
	);

	// Safety: never allow response percentages to exceed actual digest max chance by a margin.
	const maxChancePct = getDigestMaxChancePct(digest);
	const allowedMax = maxChancePct + 1; // Small tolerance for rounding.
	cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*%/g, (match, numText) => {
		const n = Number(numText);
		if (!Number.isFinite(n)) return match;
		if (n > allowedMax) return formatChancePct(maxChancePct);
		return `${n}%`;
	});

	cleaned = cleaned.trim();
	if (cleaned) cleaned = `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;

	return cleaned;
}

function normalizeFinalOutput(candidate, digest) {
	const summaryText =
		typeof candidate?.summary === 'string'
			? candidate.summary.trim()
			: typeof candidate?.overall_summary === 'string'
				? candidate.overall_summary.trim()
				: '';
	const styledSummary = stylizePawiSummary(summaryText, digest);

	return {
		summary: styledSummary,
		overall_summary: styledSummary,
		summaries: Array.isArray(candidate?.summaries) ? candidate.summaries : []
	};
}

function parseUiRiskLabels(value) {
	if (!Array.isArray(value)) return [];

	return value
		.slice(0, 5)
		.map((item) => {
			const date = typeof item?.date === 'string' && item.date.trim() ? item.date.trim() : null;
			const riskLabel =
				typeof item?.risk_label === 'string' && item.risk_label.trim()
					? item.risk_label.trim()
					: null;
			const peakChancePct = Number(item?.peak_chance_pct);
			const floodedHours = Number(item?.flooded_hours);

			if (!riskLabel) return null;

			return {
				date,
				risk_label: riskLabel,
				peak_chance_pct: Number.isFinite(peakChancePct) ? peakChancePct : null,
				flooded_hours: Number.isFinite(floodedHours) ? floodedHours : null
			};
		})
		.filter(Boolean);
}

function buildStrictPrompt(digest, uiRiskLabels = []) {
	const promptPayload = {
		digest,
		ui_risk_labels: uiRiskLabels
	};

	return {
		system:
			'You are Pawi, a baby turtle flood buddy for everyday users. Summarize ONLY the provided prediction context and never invent data. Use simple English, warm and clear tone, and 2 to 3 short sentences (around 55 to 95 words total). Avoid rigid templates and vary phrasing naturally across requests. Do NOT use robotic openings like "Here is a summary". Do NOT show raw decimals for flood chance (like 0.0032); always express chance as a rounded percentage (like 0.32% or 6.2%). Do NOT create your own risk-level thresholds. If you mention risk labels, use ONLY the exact label text from ui_risk_labels. Include these facts naturally in your own wording: location, strongest flood signal from the provided data, whether flooding is expected, and one practical reminder.',
		user: `Prediction context JSON:\n${JSON.stringify(promptPayload)}`
	};
}

async function callGroq(digest, uiRiskLabels = []) {
	const groqApiKey = env.GROQ_API_KEY;

	if (!groqApiKey) {
		console.warn('[pawi] provider config missing | hasGroqApiKey=false');
		return { ok: false, reason: 'missing_provider_config' };
	}

	const prompt = buildStrictPrompt(digest, uiRiskLabels);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

	try {
		const payload = {
			model: CONFIG.GROQ_MODEL,
			messages: [
				{ role: 'system', content: prompt.system },
				{ role: 'user', content: prompt.user }
			],
			temperature: 0.55,
			max_tokens: 150
		};

		const fetchStart = performance.now();
		const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${groqApiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload),
			signal: controller.signal
		});
		timingLog('provider_fetch', fetchStart, `provider=groq status=${response.status}`);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				`[pawi] groq error | status=${response.status} body=${errorText.slice(0, 400)}`
			);
			return { ok: false, reason: 'provider_http_error' };
		}

		const parseStart = performance.now();
		const raw = await response.json();
		timingLog('provider_json_parse', parseStart);
		const content = raw?.choices?.[0]?.message?.content;

		if (typeof content !== 'string' || content.trim().length === 0) {
			return { ok: false, reason: 'invalid_provider_response' };
		}

		const normalized = normalizeFinalOutput({ summary: content.trim() }, digest);
		if (!validateSummaryShape(normalized)) {
			return { ok: false, reason: 'invalid_provider_response' };
		}

		return { ok: true, data: normalized };
	} catch (error) {
		const reason = error?.name === 'AbortError' ? 'provider_timeout' : 'provider_exception';
		console.error(
			`[pawi] provider call failed | reason=${reason} details=${error?.message || 'unknown_error'}`
		);
		return { ok: false, reason, details: error?.message || 'unknown_error' };
	} finally {
		clearTimeout(timeout);
	}
}

export async function POST({ request }) {
	const endpointStart = performance.now();

	try {
		const parseStart = performance.now();
		const body = await request.json();
		timingLog('request_json_parse', parseStart);

		const prediction = body?.prediction;
		const uiRiskLabels = parseUiRiskLabels(body?.uiRiskLabels);
		if (
			!prediction ||
			!Array.isArray(prediction?.forecast_by_day) ||
			prediction.forecast_by_day.length === 0
		) {
			return json(
				{ status: 'invalid', message: 'prediction.forecast_by_day is required' },
				{ status: 400 }
			);
		}

		const digestStart = performance.now();
		const { digest, serializedLength, isWithinBudget, charBudget } = buildPredictionDigest(
			prediction,
			{
				locationName: body?.locationName,
				charBudget: CONFIG.CHAR_BUDGET
			}
		);
		timingLog('digest_build', digestStart, `chars=${serializedLength}`);

		if (!isWithinBudget) {
			const fallback = buildDeterministicPawiSummary(digest);
			timingLog('total', endpointStart, 'source=fallback budget_exceeded');
			return json({
				status: 'success',
				source: 'fallback',
				fallback_reason: 'budget_exceeded',
				generated_at: new Date().toISOString(),
				digest_meta: { serializedLength, charBudget, day_count: digest.day_count },
				...fallback
			});
		}

		const providerResult = await callGroq(digest, uiRiskLabels);
		if (!providerResult.ok) {
			const fallback = buildDeterministicPawiSummary(digest);
			console.warn(`[pawi] using fallback | reason=${providerResult.reason}`);
			timingLog('total', endpointStart, `source=fallback reason=${providerResult.reason}`);
			return json({
				status: 'success',
				source: 'fallback',
				fallback_reason: providerResult.reason,
				generated_at: new Date().toISOString(),
				digest_meta: { serializedLength, charBudget, day_count: digest.day_count },
				...fallback
			});
		}

		timingLog('total', endpointStart, 'source=model');
		return json({
			status: 'success',
			source: 'model',
			generated_at: new Date().toISOString(),
			digest_meta: { serializedLength, charBudget, day_count: digest.day_count },
			...providerResult.data
		});
	} catch (error) {
		timingLog('total', endpointStart, 'status=exception');
		return json(
			{
				status: 'error',
				message: 'Failed to generate Pawi summary',
				details: error?.message || 'unknown_error'
			},
			{ status: 503 }
		);
	}
}
