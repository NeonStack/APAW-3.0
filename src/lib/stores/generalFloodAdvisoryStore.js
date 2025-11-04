import { writable } from 'svelte/store';

export const generalFloodAdvisoryStore = writable({
    data: null,
    loading: true,
    error: null
});

export async function fetchGeneralFloodAdvisory() {
    generalFloodAdvisoryStore.update((state) => ({ ...state, loading: true, error: null }));

    try {
        const response = await fetch('/api/general-flood-advisory');
        if (!response.ok) throw new Error('Failed to fetch flood advisory');

        const data = await response.json();

        console.log('General Flood Advisory Data:', data);
        generalFloodAdvisoryStore.update((state) => ({ ...state, data, loading: false }));
    } catch (error) {
        generalFloodAdvisoryStore.update((state) => ({
            ...state,
            error: error.message,
            loading: false
        }));
    }
}

/*
Expected data structure if an advisory is active:
{
    "sent": "2025-11-04T05:11:29+08:00",
    "expires": "2025-11-04T17:11:29+08:00",
    "polygon": "14.767928533352,121.10203791632 14.520663584434,121.11480109008 14.520506570554,121.11429484768 14.347454023196,121.01386683476 14.473860833486,120.9718174024 14.715097307996,120.9060060923 14.690356994047,120.95842832784 14.690896835939,120.95927039565 14.708989380353,120.94825870029 14.709743389485,120.947946199 14.721820033192,120.93701245881 14.722336465182,120.94787879509 14.726374422426,120.96185209331 14.7296743464,120.96533530454 14.730973681699,120.96633984784 14.73266168728,120.96751760001 14.767928533352,121.10203791632",
    "areaDesc": "Metro Manila",
    "headline": "General Flood Advisory",
    "severity": "Moderate",
    "description": "Under present weather conditions, At 3:00 AM today, the center of the eye of Typhoon \"TINO\" {KALMAEGI} was estimated based on all available data over the coastal waters of Tudela, Cebu (10.7&#xB0;N, 124.5&#xB0;E) with maximum sustained winds of 150 km/h near the center and gustiness of up to 205 km/h. It is moving Westward at 25 km/h.  \nThe 12-hour rainfall forecast is light to moderate rains and thunderstorms.  \nWATERCOURSES STILL LIKELY TO BE AFFECTED :  \n\n + **Metro Manila** - All rivers and streams in Metro Manila.",
    "instruction": "People living near the mountain slopes and in the low lying areas of the above mentioned river systems and the **Local Disaster Risk Reduction and Management Councils** concerned still advised to take necessary precautionary measures."
}

If no advisory is active, the data will be `null`.
*/