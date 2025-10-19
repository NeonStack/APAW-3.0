// Using $env/static/private as you requested
import { SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import { GoogleGenAI, Type } from '@google/genai';
import { Buffer } from 'buffer';

// --- 1. INITIALIZE AI CLIENT ---
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// --- 2. UPDATED AI SCHEMA (REMOVING current_location) ---
const bulletinSchema = {
	type: Type.OBJECT,
	properties: {
		headline: { 
			type: Type.STRING,
			description: "The main headline, usually in all-caps, e.g., '“RAMIL” MAINTAINS ITS STRENGTH...'"
		},
		storm_name: { type: Type.STRING, 
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
		// 'current_location' object is GONE from here
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
	// 'current_location' is GONE from 'required'
	required: ['headline', 'storm_name', 'issued_at', 'forecast_track']
};

// --- 3. THE API ENDPOINT (Checks 'cache_expiry_time') ---
export async function GET({ platform }) {
	// Initialize Supabase client *inside* the function, as you requested
	const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
	const now = new Date();

	// FIX: We now check 'cache_expiry_time' to solve the fetch loop
	const { data: oldestCache } = await supabase
		.from('pagasa_active_bulletins')
		.select('cache_expiry_time') // <-- This is the fix
		.order('cache_expiry_time', { ascending: true })
		.limit(1)
		.single();

	// This logic is now correct.
	const isCacheStale = !oldestCache || new Date(oldestCache.cache_expiry_time) < now;

	if (isCacheStale) {
		console.log('Cache is STALE. Triggering background fetch.');

		// Pass the supabase client to the background function
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

	// This part is unchanged and correct
	const { data: activeStorms } = await supabase
		.from('pagasa_active_bulletins')
		.select('forecast_data')
		.eq('bulletin_type', 'ACTIVE_STORM');

	return json(activeStorms ? activeStorms.map((storm) => storm.forecast_data) : []);
}

// ===================================================================
//
// --- 4. BACKGROUND TASK & HELPER FUNCTIONS (UPDATED) ---
//
// ===================================================================

async function doBackgroundFetch(currentDate, supabase) {
	console.log('BACKGROUND: Starting fetch...');
	const newBulletinRows = []; // Build new data *in memory* first

	try {
		// 1. Fetch latest bulletin URLs
		const bulletinsToFetch = await getLatestBulletinsFromPAGASA();
		let shortestCacheTime = null;

		// 2. Handle "No Storms"
		if (bulletinsToFetch.length === 0) {
			console.log('BACKGROUND: No active storms found. Creating negative cache.');
			const sixHoursFromNow = new Date(currentDate.getTime() + 6 * 60 * 60 * 1000);

			newBulletinRows.push({
				bulletin_type: 'EMPTY_CACHE',
				cache_expiry_time: sixHoursFromNow.toISOString()
			});
			// (We don't set shortestCacheTime, it's just this one row)
		} else {
			// 3. Handle "Active Storms Found"
			console.log(`BACKGROUND: Found ${bulletinsToFetch.length} storm(s).`);

			for (const bulletin of bulletinsToFetch) {
				console.log(`BACKGROUND: Processing ${bulletin.name}...`);

				const { base64Data, mimeType } = await downloadPDFForGemini(bulletin.url);
				const aiResponse = await callGeminiAIWithPDF(base64Data, mimeType, currentDate);

				let cacheExpiry;
				// Use the valid_until from the AI response (which can be null)
				const validUntilDate = aiResponse.valid_until ? new Date(aiResponse.valid_until) : null;

				// This is our "late PDF" / "fetch loop" fix
				if (validUntilDate && validUntilDate > currentDate) {
					cacheExpiry = new Date(validUntilDate.getTime() + 1 * 60 * 60 * 1000);
				} else {
					cacheExpiry = new Date(currentDate.getTime() + 1 * 60 * 60 * 1000);
				}

				if (!shortestCacheTime || cacheExpiry < shortestCacheTime) {
					shortestCacheTime = cacheExpiry;
				}

				// --- UPDATED PUSH (Matches our simpler DB) ---
				newBulletinRows.push({
					bulletin_type: 'ACTIVE_STORM',
					forecast_data: aiResponse, // The full JSON from AI
					cache_expiry_time: cacheExpiry.toISOString()
				});
			}

			// Add the "global timer" row (your Q1)
			if (shortestCacheTime) {
				newBulletinRows.push({
					bulletin_type: 'EMPTY_CACHE',
					cache_expiry_time: shortestCacheTime.toISOString()
				});
			}
		} // End of storm processing

		// --- ATOMIC UPDATE ---
		// Only *after* all new data is ready, we swap it in.
		console.log('BACKGROUND: New data successfully processed. Swapping cache...');

		// 1. Delete all old rows
		await supabase.from('pagasa_active_bulletins').delete().neq('id', -1);

		// 2. Insert all new rows
		await supabase.from('pagasa_active_bulletins').insert(newBulletinRows);

		console.log('BACKGROUND: Fetch complete. Database updated.');
	} catch (error) {
		// --- NEW ERROR HANDLING (Your Q2 Fix) ---
		// This block now runs if Gemini fails or *any* part of the 'try' fails.
		console.error('BACKGROUND: Error during background fetch:', error);

		// We do NOT delete the old data. We just "snooze" the cache.
		// Set expiry to 15 minutes from now to prevent a spam loop.
		const fifteenMinsFromNow = new Date(currentDate.getTime() + 15 * 60 * 1000);

		// This updates *only* the timer row, leaving the stale storm data intact.
		await supabase
			.from('pagasa_active_bulletins')
			.update({ cache_expiry_time: fifteenMinsFromNow.toISOString() })
			.eq('bulletin_type', 'EMPTY_CACHE'); // Only update the timer

		console.log('BACKGROUND: Error handled. Snoozing cache for 15 minutes.');
	}
}

// --- HELPER 5: Scrape PAGASA Directory (Corrected URL/Parser) ---
const PAGASA_URL = 'https://pubfiles.pagasa.dost.gov.ph/tamss/weather/bulletin/';
// This regex parses the <a href="...">...</a> ... (timestamp) format
const htmlRegex =
	/href="(TCB%23([\w\d]+)_([\w-]+)\.pdf)"[^<]*<\/a>\s+([\d-]{2}-[A-Za-z]{3}-\d{4} \d{2}:\d{2})/g;

async function getLatestBulletinsFromPAGASA() {
	const response = await fetch(PAGASA_URL);
	if (!response.ok) {
		throw new Error(`Failed to fetch PAGASA directory: ${response.statusText}`);
	}
	const html = await response.text();

	const allBulletins = [];

	// Find all matches for our regex in the HTML
	for (const match of html.matchAll(htmlRegex)) {
		const href = match[1]; // e.g., "TCB%2313_ramil.pdf"
		const bulletinNumber = parseInt(match[2], 10) || 0; // e.g., 13
		const name = match[3]; // e.g., "ramil"
		const timestamp = match[4]; // e.g., "18-Oct-2025 15:22"

		allBulletins.push({
			filename: href,
			bulletinNumber: bulletinNumber,
			name: name,
			date: new Date(timestamp), // This is the UTC file time
			url: `${PAGASA_URL}${href}` // The full URL to the PDF
		});
	}

	// Group by typhoon name
	const bulletinsByName = new Map();
	for (const bulletin of allBulletins) {
		if (!bulletinsByName.has(bulletin.name)) bulletinsByName.set(bulletin.name, []);
		bulletinsByName.get(bulletin.name).push(bulletin);
	}

	// Find the latest bulletin number for each name
	const latestBulletins = [];
	const cutoffDate = new Date().getTime() - 48 * 60 * 60 * 1000; // 48-hour cutoff

	for (const [name, bulletins] of bulletinsByName.entries()) {
		bulletins.sort((a, b) => b.bulletinNumber - a.bulletinNumber);
		const latest = bulletins[0];

		// Only include if its (UTC) file time is recent
		if (latest.date.getTime() > cutoffDate) {
			latestBulletins.push(latest);
		}
	}
	return latestBulletins;
}

// --- HELPER 6: Download PDF for Gemini (Unchanged) ---
async function downloadPDFForGemini(url) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to download PDF: ${response.statusText}`);

	const mimeType = response.headers.get('content-type') || 'application/pdf';
	const arrayBuffer = await response.arrayBuffer();
	const base64Data = Buffer.from(arrayBuffer).toString('base64');

	return { base64Data, mimeType };
}

// --- HELPER 7: Call Gemini AI with PDF (UPDATED PROMPT) ---
async function callGeminiAIWithPDF(pdfBase64, mimeType, currentDate) {
	const todayString = currentDate.toLocaleString('en-US', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Asia/Manila'
	});

	// --- THIS IS THE FINAL, UPDATED PROMPT ---
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
			model: 'gemini-flash-latest',
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

		return JSON.parse(response.text);
	} catch (e) {
		console.error('Gemini AI Error:', e);
		throw new Error('Failed to parse bulletin with AI.');
	}
}