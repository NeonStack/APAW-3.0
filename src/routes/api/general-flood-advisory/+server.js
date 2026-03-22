import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import { XMLParser } from 'fast-xml-parser';

// ===================================================================
// --- CONFIGURATION ---
// ===================================================================
const CONFIG = {
    // How old a GFA entry in the main feed can be before we ignore it.
    GFA_CUTOFF_HOURS: 24,

    // How long to cache when PAGASA has no active GFA for NCR.
    CACHE_MINS_NO_ADVISORY: 60,

    // How long to "snooze" before retrying if an error occurs.
    CACHE_MINS_ON_ERROR: 15
};

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
});

// --- API ENDPOINT ---
export async function GET({ platform }) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const now = new Date();

    const { data: cacheStatus } = await supabase
        .from('pagasa_flood_advisories')
        .select('cache_expiry_time')
        .limit(1)
        .single();

    const isCacheStale = !cacheStatus || new Date(cacheStatus.cache_expiry_time) < now;

    if (isCacheStale) {
        console.log('GFA Cache is STALE. Triggering background fetch.');
        const backgroundFetchTask = doBackgroundFetch(now, supabase);

        if (platform?.context?.waitUntil) {
            platform.context.waitUntil(backgroundFetchTask);
        } else {
            await backgroundFetchTask; // Dev mode
        }
    } else {
        console.log('GFA Cache is FRESH.');
    }

    const { data: activeAdvisory } = await supabase
        .from('pagasa_flood_advisories')
        .select('advisory_data')
        .eq('advisory_type', 'ACTIVE_NCR_GFA')
        .limit(1)
        .single();

    return json(activeAdvisory?.advisory_data || null);
}

// ===================================================================
// --- BACKGROUND TASK & HELPERS ---
// ===================================================================

async function doBackgroundFetch(currentDate, supabase) {
    console.log('GFA BACKGROUND: Starting fetch...');
    let newDbRow = null;

    try {
        const ncrGfaUrl = await getLatestNcrGfaUrl();

        if (!ncrGfaUrl) {
            console.log('GFA BACKGROUND: No recent NCR GFA found in feed.');
            const cacheExpiry = new Date(
                currentDate.getTime() + CONFIG.CACHE_MINS_NO_ADVISORY * 60 * 1000
            );
            newDbRow = {
                advisory_type: 'EMPTY_CACHE',
                cache_expiry_time: cacheExpiry.toISOString()
            };
        } else {
            console.log(`GFA BACKGROUND: Found GFA URL: ${ncrGfaUrl}`);
            const capData = await fetchAndParseCapFile(ncrGfaUrl);

            const expiresDate = new Date(capData.expires);

            if (expiresDate > currentDate) {
                console.log('GFA BACKGROUND: Advisory is active. Caching until it expires.');
                newDbRow = {
                    advisory_type: 'ACTIVE_NCR_GFA',
                    advisory_data: capData,
                    cache_expiry_time: expiresDate.toISOString()
                };
            } else {
                console.log('GFA BACKGROUND: Found advisory has already expired.');
                const cacheExpiry = new Date(
                    currentDate.getTime() + CONFIG.CACHE_MINS_NO_ADVISORY * 60 * 1000
                );
                newDbRow = {
                    advisory_type: 'EMPTY_CACHE',
                    cache_expiry_time: cacheExpiry.toISOString()
                };
            }
        }

        console.log('GFA BACKGROUND: Swapping cache...');
        await supabase.from('pagasa_flood_advisories').delete().neq('id', -1); // Clear table
        await supabase.from('pagasa_flood_advisories').insert(newDbRow);
        console.log('GFA BACKGROUND: Fetch complete. Database updated.');
    } catch (error) {
        console.error('GFA BACKGROUND: Error during background fetch:', error);
        const snoozeTime = new Date(currentDate.getTime() + CONFIG.CACHE_MINS_ON_ERROR * 60 * 1000);

        await supabase.from('pagasa_flood_advisories').delete().neq('id', -1);
        await supabase.from('pagasa_flood_advisories').insert({
            advisory_type: 'EMPTY_CACHE',
            cache_expiry_time: snoozeTime.toISOString()
        });

        console.log(`GFA BACKGROUND: Error handled. Snoozing for ${CONFIG.CACHE_MINS_ON_ERROR} mins.`);
    }
}

async function getLatestNcrGfaUrl() {
    const response = await fetch('https://publicalert.pagasa.dost.gov.ph/feeds/');
    if (!response.ok) throw new Error(`Failed to fetch PAGASA feed: ${response.statusText}`);

    const xmlText = await response.text();
    const feed = parser.parse(xmlText);
    const rawEntries = feed?.feed?.entry;
    const entries = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [];

    if (entries.length === 0) {
        console.warn('GFA BACKGROUND: PAGASA feed has no entries to scan.');
        return null;
    }

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - CONFIG.GFA_CUTOFF_HOURS);

    for (const entry of entries) {
        const title = entry.title || '';
        if (title.includes('GFA') && title.includes('NCR')) {
            const updatedDate = new Date(entry.updated);
            if (updatedDate > cutoffDate) {
                return entry.link['@_href'];
            }
        }
    }
    return null;
}

async function fetchAndParseCapFile(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch CAP file: ${response.statusText}`);

    const xmlText = await response.text();
    const cap = parser.parse(xmlText);
    const info = cap.alert.info;

    return {
        sent: cap.alert.sent,
        headline: info.headline,
        description: info.description,
        instruction: info.instruction,
        severity: info.severity,
        expires: info.expires,
        areaDesc: info.area.areaDesc,
        polygon: info.area.polygon
    };
}