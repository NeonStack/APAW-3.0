import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import { XMLParser } from 'fast-xml-parser';

const CONFIG = {
    TCW_CUTOFF_HOURS: 24,
    CACHE_MINS_NO_SIGNAL: 60,
    CACHE_MINS_ON_ERROR: 15
};

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
});

export async function GET({ platform }) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const now = new Date();

    const { data: cacheStatus } = await supabase
        .from('pagasa_tcw_signals')
        .select('cache_expiry_time')
        .limit(1)
        .single();

    const isCacheStale = !cacheStatus || new Date(cacheStatus.cache_expiry_time) < now;

    if (isCacheStale) {
        console.log('TCW Cache is STALE. Triggering background fetch.');
        const bgTask = doBackgroundFetch(now, supabase);

        if (platform?.context?.waitUntil) platform.context.waitUntil(bgTask);
        else await bgTask;
    } else {
        console.log('TCW Cache is FRESH.');
    }

    const { data: activeSignal } = await supabase
        .from('pagasa_tcw_signals')
        .select('advisory_data')
        .eq('advisory_type', 'ACTIVE_NCR_TCW')
        .limit(1)
        .single();

    return json(activeSignal?.advisory_data || null);
}

// ===================================================================
// --- BACKGROUND FETCH ---
// ===================================================================

async function doBackgroundFetch(currentDate, supabase) {
    console.log('TCW BACKGROUND: Starting fetch...');
    let newDbRow = null;

    try {
        const ncrTcwUrl = await getLatestNcrTcwUrl();

        if (!ncrTcwUrl) {
            console.log('No NCR TCW found.');
            const cacheExpiry = new Date(currentDate.getTime() + CONFIG.CACHE_MINS_NO_SIGNAL * 60 * 1000);
            newDbRow = { advisory_type: 'EMPTY_CACHE', cache_expiry_time: cacheExpiry.toISOString() };
        } else {
            console.log(`Found NCR TCW URL: ${ncrTcwUrl}`);
            const capData = await fetchAndParseCapFile(ncrTcwUrl);

            const expiresDate = new Date(capData.expires);
            newDbRow = {
                advisory_type: 'ACTIVE_NCR_TCW',
                signal_number: capData.signalNumber,
                typhoon_name: capData.typhoonName,
                advisory_data: capData,
                cache_expiry_time: expiresDate.toISOString()
            };
        }

        await supabase.from('pagasa_tcw_signals').delete().neq('id', -1);
        await supabase.from('pagasa_tcw_signals').insert(newDbRow);
        console.log('TCW BACKGROUND: Database updated.');
    } catch (error) {
        console.error('TCW BACKGROUND ERROR:', error);
        const snoozeTime = new Date(currentDate.getTime() + CONFIG.CACHE_MINS_ON_ERROR * 60 * 1000);

        await supabase.from('pagasa_tcw_signals').delete().neq('id', -1);
        await supabase.from('pagasa_tcw_signals').insert({
            advisory_type: 'EMPTY_CACHE',
            cache_expiry_time: snoozeTime.toISOString()
        });
    }
}

// ===================================================================
// --- HELPERS ---
// ===================================================================

async function getLatestNcrTcwUrl() {
    const response = await fetch('https://publicalert.pagasa.dost.gov.ph/feeds/');
    if (!response.ok) throw new Error(`Failed to fetch PAGASA feed: ${response.statusText}`);

    const xmlText = await response.text();
    const feed = parser.parse(xmlText);
    const entries = Array.isArray(feed.feed.entry) ? feed.feed.entry : [feed.feed.entry];

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - CONFIG.TCW_CUTOFF_HOURS);

    for (const entry of entries) {
        const title = entry.title || '';
        if (title.includes('Tropical Cyclone Warning') && title.includes('NCR')) {
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
    const headline = info.headline || '';
    
    // Extract signal number (e.g., "Signal #2")
    const signalMatch = headline.match(/Signal\s?#(\d+)/i);
    const signalNumber = signalMatch ? parseInt(signalMatch[1]) : null;
    const typhoonMatch = headline.match(/Typhoon\s+([A-Za-z\s\(\)]+)/i);
    const typhoonName = typhoonMatch ? typhoonMatch[1].trim() : 'Unknown';

    return {
        sent: cap.alert.sent,
        headline,
        description: info.description,
        instruction: info.instruction,
        severity: info.severity,
        signalNumber,
        typhoonName,
        expires: info.expires,
        areaDesc: info.area.areaDesc
    };
}
