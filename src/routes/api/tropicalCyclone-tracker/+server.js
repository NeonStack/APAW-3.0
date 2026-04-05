// Using $env/static/private as you requested
import { GEMINI_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { GoogleGenAI, Type } from '@google/genai';
import { Buffer } from 'buffer';
import { getSupabaseServiceClient } from '$lib/server/supabaseClient.js';

// ===================================================================
// --- CONFIGURATION ---
// Central place to easily adjust key parameters for the script.
// ===================================================================
const CONFIG = {
	// AI Model to use for parsing. (Used in: callGeminiAIWithPDF)
	AI_MODEL: 'gemini-flash-latest',

	// How old a PDF file can be before we ignore it completely. (Used in: getLatestBulletinsFromPAGASA)
	PDF_CUTOFF_HOURS: 72, // 3 days

	// How long to cache when PAGASA has no active storms. (Used in: doBackgroundFetch)
	CACHE_HOURS_NO_STORM: 6,

	// Cache time for a "Final Bulletin" (when valid_until is null because the storm is over). (Used in: doBackgroundFetch)
	CACHE_HOURS_FINAL_BULLETIN: 6,

	// Default cache time for an active storm bulletin (formula: valid_until + CACHE_HOURS_DEFAULT). (Used in: doBackgroundFetch)
	CACHE_HOURS_DEFAULT: 1,

	// How long to "snooze" before retrying if an error occurs during the fetch. (Used in: doBackgroundFetch)
	CACHE_MINS_ON_ERROR: 15
};

// --- 1. INITIALIZE AI CLIENT ---
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// --- 2. AI SCHEMA ---
const bulletinSchema = {
	type: Type.OBJECT,
	properties: {
		headline: {
			type: Type.STRING,
			description:
				"The main headline, usually in all-caps, e.g., '“RAMIL” MAINTAINS ITS STRENGTH...'"
		},
		storm_name: {
			type: Type.STRING,
			description: 'Name of the tropical cyclone without the category,  e.g., RAMIL (FENGSHEN)'
		},
		issued_at: {
			type: Type.STRING,
			description: 'ISO 8601 Timestamp with offset (YYYY-MM-DDTHH:mm:ss+08:00)'
		},
		valid_until: {
			type: Type.STRING,
			description: 'Calculated ISO 8601 Timestamp with offset (YYYY-MM-DDTHH:mm:ss+08:00) OR null'
		},
		forecast_track: {
			type: Type.ARRAY,
			items: {
				type: Type.OBJECT,
				properties: {
					date_time: { type: Type.STRING },
					location: { type: Type.STRING },
					lat: { type: Type.NUMBER },
					lon: { type: Type.NUMBER },
					msw_kmh: { type: Type.NUMBER },
					category: { type: Type.STRING },
					movement: { type: Type.STRING }
				},
				required: ['date_time', 'location', 'lat', 'lon', 'msw_kmh', 'category', 'movement']
			}
		}
	},
	required: ['headline', 'storm_name', 'issued_at', 'forecast_track']
};

// --- 3. THE API ENDPOINT ---
export async function GET({ platform }) {
	const supabase = getSupabaseServiceClient();
	const now = new Date();

	const { data: oldestCache } = await supabase
		.from('pagasa_active_bulletins')
		.select('cache_expiry_time')
		.order('cache_expiry_time', { ascending: true })
		.limit(1)
		.single();

	const isCacheStale = !oldestCache || new Date(oldestCache.cache_expiry_time) < now;

	if (isCacheStale) {
		console.log('Cache is STALE. Triggering background fetch.');
		const backgroundFetchTask = doBackgroundFetch(now, supabase);

		if (platform?.context?.waitUntil) {
			platform.context.waitUntil(backgroundFetchTask);
		} else {
			console.warn('Running fetch in foreground (dev mode)...');
			await backgroundFetchTask;
		}
	} else {
		console.log('Cache is FRESH.');
	}

	const { data: activeStormsFromDB } = await supabase
		.from('pagasa_active_bulletins')
		.select('forecast_data')
		.eq('bulletin_type', 'ACTIVE_STORM');

	if (!activeStormsFromDB) {
		return json([]);
	}

	// Filter out storms whose entire forecast track is in the past.
	const stillActiveStorms = activeStormsFromDB.filter((storm) => {
		const track = storm.forecast_data?.forecast_track;
		if (!track || track.length === 0) {
			return false; // Discard if no track data
		}
		const lastPointTime = new Date(track[track.length - 1].date_time);
		return lastPointTime >= now; // Keep if the storm's forecast is not yet over
	});

	return json(stillActiveStorms ? stillActiveStorms.map((storm) => storm.forecast_data) : []);
}

// ===================================================================
// --- 4. BACKGROUND TASK & HELPER FUNCTIONS ---
// ===================================================================

async function doBackgroundFetch(currentDate, supabase) {
	console.log('BACKGROUND: Starting fetch...');
	const newBulletinRows = [];

	try {
		const bulletinsToFetch = await getLatestBulletinsFromPAGASA();
		let shortestCacheTime = null;

		if (bulletinsToFetch.length === 0) {
			console.log('BACKGROUND: No active storms found. Creating negative cache.');
			const cacheExpiry = new Date(
				currentDate.getTime() + CONFIG.CACHE_HOURS_NO_STORM * 60 * 60 * 1000
			);

			newBulletinRows.push({
				bulletin_type: 'EMPTY_CACHE',
				cache_expiry_time: cacheExpiry.toISOString()
			});
		} else {
			console.log(`BACKGROUND: Found ${bulletinsToFetch.length} potential bulletin(s) to process.`);
			const processedStorms = new Map();

			for (const bulletin of bulletinsToFetch) {
				console.log(`BACKGROUND: Processing ${bulletin.name} (${bulletin.filename})...`);

				const { base64Data, mimeType } = await downloadPDFForGemini(bulletin.url);
				const aiResponse = await callGeminiAIWithPDF(base64Data, mimeType, currentDate);

				if (aiResponse && aiResponse.valid_until === 'null') {
					aiResponse.valid_until = null;
				}

				if (!aiResponse?.storm_name || !aiResponse?.forecast_track?.length) {
					console.warn(
						`BACKGROUND: Discarding ${bulletin.name} due to missing storm name or forecast track from AI.`
					);
					continue;
				}

				const lastForecastPoint = aiResponse.forecast_track[aiResponse.forecast_track.length - 1];
				if (lastForecastPoint && new Date(lastForecastPoint.date_time) < currentDate) {
					console.log(
						`BACKGROUND: Discarding ${bulletin.name} as its forecast is entirely in the past.`
					);
					continue;
				}

				// --- Deduplication Logic ---
				// Normalize name to handle "UWAN (FUNG-WONG)" vs "FUNG-WONG" by using the international name.
				const stormName = aiResponse.storm_name;
				let normalizedName;

				const internationalNameMatch = stormName.match(/\(([^)]+)\)/);
				if (internationalNameMatch) {
					// Found international name in parentheses, e.g., "UWAN (FUNG-WONG)" -> "FUNG-WONG"
					normalizedName = internationalNameMatch[1].trim().toUpperCase();
				} else {
					// No parentheses, use the whole name, e.g., "FUNG-WONG" -> "FUNG-WONG"
					normalizedName = stormName.trim().toUpperCase();
				}

				const existingStorm = processedStorms.get(normalizedName);
				const newIssueDate = new Date(aiResponse.issued_at);

				if (!existingStorm || newIssueDate > new Date(existingStorm.issued_at)) {
					console.log(`BACKGROUND: Storing/updating data for storm "${normalizedName}".`);
					processedStorms.set(normalizedName, aiResponse);
				} else {
					console.log(
						`BACKGROUND: Discarding older data for storm "${normalizedName}" (issued at ${aiResponse.issued_at}).`
					);
				}
			}

			const finalStorms = Array.from(processedStorms.values());

			if (finalStorms.length > 0) {
				console.log(
					`BACKGROUND: Processing ${finalStorms.length} unique storm(s) for database update.`
				);
				for (const aiResponse of finalStorms) {
					let cacheExpiry;
					const validUntilDate = aiResponse.valid_until ? new Date(aiResponse.valid_until) : null;

					if (!validUntilDate) {
						cacheExpiry = new Date(
							currentDate.getTime() + CONFIG.CACHE_HOURS_FINAL_BULLETIN * 60 * 60 * 1000
						);
					} else if (validUntilDate > currentDate) {
						cacheExpiry = new Date(
							validUntilDate.getTime() + CONFIG.CACHE_HOURS_DEFAULT * 60 * 60 * 1000
						);
					} else {
						cacheExpiry = new Date(
							currentDate.getTime() + CONFIG.CACHE_HOURS_DEFAULT * 60 * 60 * 1000
						);
					}

					if (!shortestCacheTime || cacheExpiry < shortestCacheTime) {
						shortestCacheTime = cacheExpiry;
					}

					newBulletinRows.push({
						bulletin_type: 'ACTIVE_STORM',
						forecast_data: aiResponse,
						cache_expiry_time: cacheExpiry.toISOString()
					});
				}
			}

			if (shortestCacheTime) {
				newBulletinRows.push({
					bulletin_type: 'EMPTY_CACHE',
					cache_expiry_time: shortestCacheTime.toISOString()
				});
			} else if (newBulletinRows.length === 0) {
				console.log(
					'BACKGROUND: All found bulletins were outdated or invalid. Creating negative cache.'
				);
				const cacheExpiry = new Date(
					currentDate.getTime() + CONFIG.CACHE_HOURS_NO_STORM * 60 * 60 * 1000
				);
				newBulletinRows.push({
					bulletin_type: 'EMPTY_CACHE',
					cache_expiry_time: cacheExpiry.toISOString()
				});
			}
		}

		console.log('BACKGROUND: New data successfully processed. Swapping cache...');
		await supabase.from('pagasa_active_bulletins').delete().neq('id', -1);
		await supabase.from('pagasa_active_bulletins').insert(newBulletinRows);
		console.log('BACKGROUND: Fetch complete. Database updated.');
	} catch (error) {
		console.error('BACKGROUND: Error during background fetch:', error);
		const snoozeTime = new Date(currentDate.getTime() + CONFIG.CACHE_MINS_ON_ERROR * 60 * 1000);

		await supabase.from('pagasa_active_bulletins').upsert(
			{
				bulletin_type: 'EMPTY_CACHE',
				cache_expiry_time: snoozeTime.toISOString()
			},
			{ onConflict: 'bulletin_type' }
		);

		console.log(
			`BACKGROUND: Error handled. Snoozing cache for ${CONFIG.CACHE_MINS_ON_ERROR} minutes.`
		);
	}
}

// --- HELPER 5: Scrape PAGASA Directory ---
const PAGASA_BULLETIN_URL = 'https://pubfiles.pagasa.dost.gov.ph/tamss/weather/bulletin/';
const PAGASA_ADVISORY_URL = 'https://pubfiles.pagasa.dost.gov.ph/tamss/weather/';

const bulletinRegex =
	/href="(TCB%23(\d+)(F?)_([\w-]+)\.pdf)"[^<]*<\/a>\s+([\d-]{2}-[A-Za-z]{3}-\d{4} \d{2}:\d{2})/g;
const advisoryRegex =
	/href="(tcadvisory\.pdf)"[^<]*<\/a>\s+([\d-]{2}-[A-Za-z]{3}-\d{4} \d{2}:\d{2})/;

async function getLatestBulletinsFromPAGASA() {
	const [bulletinResponse, advisoryResponse] = await Promise.all([
		fetch(PAGASA_BULLETIN_URL),
		fetch(PAGASA_ADVISORY_URL)
	]);

	if (!bulletinResponse.ok) {
		throw new Error(`Failed to fetch PAGASA bulletin directory: ${bulletinResponse.statusText}`);
	}
	if (!advisoryResponse.ok) {
		throw new Error(`Failed to fetch PAGASA advisory directory: ${advisoryResponse.statusText}`);
	}

	const bulletinHtml = await bulletinResponse.text();
	const advisoryHtml = await advisoryResponse.text();
	const allBulletins = [];

	// Process regular bulletins (inside PAR)
	for (const match of bulletinHtml.matchAll(bulletinRegex)) {
		allBulletins.push({
			filename: match[1],
			bulletinNumber: parseInt(match[2], 10) || 0,
			isFinal: match[3] === 'F',
			name: match[4],
			date: new Date(match[5]),
			url: `${PAGASA_BULLETIN_URL}${match[1]}`
		});
	}

	// Process advisory (outside PAR)
	const advisoryMatch = advisoryHtml.match(advisoryRegex);
	if (advisoryMatch) {
		allBulletins.push({
			filename: advisoryMatch[1], // "tcadvisory.pdf"
			bulletinNumber: 0, // No bulletin number for advisories
			isFinal: false, // Advisories are not "final" bulletins
			name: 'tcadvisory', // Use a unique name to group it
			date: new Date(advisoryMatch[2]),
			url: `${PAGASA_ADVISORY_URL}${advisoryMatch[1]}`
		});
	}

	const bulletinsByName = new Map();
	for (const bulletin of allBulletins) {
		if (!bulletinsByName.has(bulletin.name)) bulletinsByName.set(bulletin.name, []);
		bulletinsByName.get(bulletin.name).push(bulletin);
	}

	const latestBulletins = [];
	const cutoffDate = new Date().getTime() - CONFIG.PDF_CUTOFF_HOURS * 60 * 60 * 1000;

	for (const [name, bulletins] of bulletinsByName.entries()) {
		// FIX: Implement a more robust multi-level sort
		bulletins.sort((a, b) => {
			// 1. Primary sort: Higher bulletin number wins
			if (b.bulletinNumber !== a.bulletinNumber) {
				return b.bulletinNumber - a.bulletinNumber;
			}
			// 2. Tie-breaker: If numbers are equal, the "Final" bulletin wins
			if (b.isFinal !== a.isFinal) {
				return b.isFinal ? 1 : -1;
			}
			// 3. Final tie-breaker: Newest date wins
			return b.date.getTime() - a.date.getTime();
		});

		const latest = bulletins[0];

		if (latest.date.getTime() > cutoffDate) {
			latestBulletins.push(latest);
		}
	}
	return latestBulletins;
}

// --- HELPER 6: Download PDF for Gemini ---
async function downloadPDFForGemini(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to download PDF: ${response.statusText}`);

	const mimeType = response.headers.get('content-type') || 'application/pdf';
	const arrayBuffer = await response.arrayBuffer();
	const base64Data = Buffer.from(arrayBuffer).toString('base64');

	return { base64Data, mimeType };
}

// --- HELPER 7: Call Gemini AI with PDF ---
async function callGeminiAIWithPDF(pdfBase64, mimeType, currentDate) {
	const todayString = currentDate.toLocaleString('en-US', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Asia/Manila'
	});

	const prompt = `
    You are an expert meteorological data extraction bot.
    Today's date is: ${todayString}.
    The user has provided a PDF of a PAGASA tropical cyclone bulletin.
    Analyze the PDF, paying close attention to the tables and text.

    CRITICAL: All timestamps you return MUST be in ISO 8601 format with the
    Philippine timezone offset (+08:00).
    - "Issued at 5:00 PM, 18 October 2025" -> "2025-10-18T17:00:00+08:00"
    - "Valid until 8:00 PM today" (when issued on 18 Oct) -> "2025-10-18T20:00:00+08:00"
    - "Valid until 2:00 AM tomorrow" (when issued on 18 Oct) -> "2025-10-19T02:00:00+08:00"

    CRITICAL: If the bulletin is a "FINAL BULLETIN", which means "Valid for broadcast until" line is missing near the "Issued at", you MUST return null for the valid_until field.

    NEW: Extract the "headline". This is the unlabeled, all-caps text near the top.
    - Example: "“RAMIL” IS NOW OVER MANILA BAY."
    - Example: "“RAMIL” MAINTAINS ITS STRENGTH..."
    
    CRITICAL NEW INSTRUCTION: The "current_location" data MUST be the *first item* (index 0) in the "forecast_track" array.
    To create this first item:
    1.  Find "Location of Center (X:XX PM/AM)". Use this time (e.g., "1:00 PM") and the *date* from the "Issued at" line (e.g., "18 October 2025") to create the "date_time" (e.g., "1:00 PM 18 October 2025").
    2.  Find "The center of... (XX.X°N, XX.X°E)" to get "lat", "lon", and "location_description" (which you will save as "location").
    3.  Find "Intensity" to get "msw_kmh" (e.g., "65 km/h").
    4.  Find "Present Movement" to get "movement". Abbreviate this:
        - "West northwestward at 15 km/h" -> "WNW 15"
        - "Eastward slowly" -> "E Slowly"
    5.  Determine the "category" from the "storm_name" or "Intensity" text. Use these abbreviations:
        - "Tropical Depression" -> "TD"
        - "Tropical Storm" -> "TS"
        - "Severe Tropical Storm" -> "STS"
        - "Typhoon" -> "TY"
        - "Super Typhoon" -> "STY"

    The *rest* of the items in the "forecast_track" array come from the forecast table as before.

    Return ONLY the JSON.
  `;

	try {
		const response = await ai.models.generateContent({
			model: CONFIG.AI_MODEL,
			contents: [
				{ text: prompt },
				{
					inlineData: {
						data: pdfBase64,
						mimeType: mimeType
					}
				}
			],
			config: {
				responseMimeType: 'application/json',
				responseSchema: bulletinSchema
			}
		});

		console.log('--- GEMINI RAW RESPONSE ---');
		console.log(response.text);
		console.log('---------------------------');

		return JSON.parse(response.text);
	} catch (e) {
		console.error('Gemini AI Error:', e);
		throw new Error('Failed to parse bulletin with AI.');
	}
}
