function toNumber(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function formatHour(hour) {
	if (!Number.isInteger(hour)) return 'Unknown hour';
	if (hour === 0) return '12:00 AM';
	if (hour === 12) return '12:00 PM';
	if (hour < 12) return `${hour}:00 AM`;
	return `${hour - 12}:00 PM`;
}

function summarizeDay(day) {
	const hourly = Array.isArray(day?.hourly_forecast) ? day.hourly_forecast : [];
	if (hourly.length === 0) {
		return {
			date: day?.date ?? null,
			hour_count: 0,
			max_probability: 0,
			max_height_cm: 0,
			flooded_hours_count: 0,
			total_rain_mm: 0,
			peak_hours: []
		};
	}

	const probabilities = hourly.map((h) => toNumber(h?.final_prediction?.flood_probability, 0));
	const heights = hourly.map((h) => toNumber(h?.final_prediction?.predicted_height_cm, 0));
	const rainValues = hourly.map((h) => toNumber(h?.key_features?.precip_mm, 0));

	const maxProbability = probabilities.reduce((max, val) => Math.max(max, val), 0);
	const maxHeight = heights.reduce((max, val) => Math.max(max, val), 0);
	const totalRain = rainValues.reduce((sum, val) => sum + val, 0);

	const floodedHours = hourly.filter((h) => toNumber(h?.final_prediction?.is_flooded, 0) === 1);
	const peakHours = [...floodedHours]
		.sort(
			(a, b) =>
				toNumber(b?.final_prediction?.flood_probability, 0) -
				toNumber(a?.final_prediction?.flood_probability, 0)
		)
		.slice(0, 3)
		.map((h) => ({
			hour: Number.isInteger(h?.hour) ? h.hour : null,
			label: formatHour(h?.hour),
			flood_probability: clamp(toNumber(h?.final_prediction?.flood_probability, 0), 0, 1)
		}));

	return {
		date: day?.date ?? null,
		hour_count: hourly.length,
		max_probability: clamp(maxProbability, 0, 1),
		max_height_cm: Math.max(0, maxHeight),
		flooded_hours_count: floodedHours.length,
		total_rain_mm: Math.max(0, totalRain),
		peak_hours: peakHours
	};
}

export function buildPredictionDigest(prediction, options = {}) {
	const forecastByDay = Array.isArray(prediction?.forecast_by_day)
		? prediction.forecast_by_day
		: [];
	const days = forecastByDay.slice(0, 5).map((day) => summarizeDay(day));

	const charBudget = toNumber(options.charBudget, 12000);
	const digest = {
		location_name: options.locationName || prediction?.location?.name || null,
		start_date: prediction?.location?.start_date || days[0]?.date || null,
		day_count: days.length,
		days
	};

	const serialized = JSON.stringify(digest);
	return {
		digest,
		serializedLength: serialized.length,
		isWithinBudget: serialized.length <= charBudget,
		charBudget
	};
}

export function buildDeterministicPawiSummary(digest) {
	const days = Array.isArray(digest?.days) ? digest.days : [];
	const summaries = days.map((day) => {
		const floodHours = toNumber(day?.flooded_hours_count, 0);
		const maxChancePct = Math.round(clamp(toNumber(day?.max_probability, 0), 0, 1) * 100);
		const rain = toNumber(day?.total_rain_mm, 0).toFixed(1);
		const height = toNumber(day?.max_height_cm, 0);
		const peakText = day?.peak_hours?.length
			? day.peak_hours.map((item) => item.label).join(', ')
			: 'walang clear flood peak hour';

		const summary =
			floodHours > 0
				? `Hi, for ${day.date}, there is up to a ${maxChancePct}% flood chance. Around ${floodHours} hour(s) show flood signals, with peak times around ${peakText}, total rain near ${rain}mm${height > 0 ? `, and max estimated level ${height.toFixed(2)}cm` : ''}.`
				: `Hi bestie, for ${day.date}: mostly calm day with ${maxChancePct}% max flood chance. Walang strong flood signal hours, and estimated total rain is ${rain}mm.`;

		return {
			date: day.date,
			summary
		};
	});

	const overallMax = summaries.reduce((max, item, index) => {
		const day = days[index];
		return Math.max(max, toNumber(day?.max_probability, 0));
	}, 0);

	const overallFloodHours = days.reduce(
		(sum, day) => sum + toNumber(day?.flooded_hours_count, 0),
		0
	);
	const overall =
		overallFloodHours > 0
			? `Pawi recap: may flood-risk windows across the 5-day forecast, with peak chance around ${Math.round(overallMax * 100)}%. Please monitor peak hours and stay ready.`
			: `Pawi recap: generally low flood signals in this 5-day forecast, with peak chance around ${Math.round(overallMax * 100)}%. Keep monitoring weather updates.`;

	return {
		summary: overall,
		summaries,
		overall_summary: overall
	};
}
