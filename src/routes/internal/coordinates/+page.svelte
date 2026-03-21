<script>
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { getLocationName } from '$lib/stores/locationStore.js';
	import MapSearchBar from '$lib/components/MapSearchBar.svelte';
	import { loadGeoJSON } from '$lib/components/map_components/GeoJsonUtils.js';

	export let data;
	let mapHost;
	let map;
	let L;
	let marker;
	let savedMarkers = [];
	let strictNcrBounds;
	let paddedNcrBounds;
	let latitude = '';
	let longitude = '';
	let locationName = '';
	let coordinateId = '';
	let isResolvingName = false;
	let helperMessage = '';

	const BRAND_GREEN = '#3ba630';
	const BRAND_DARK = '#0c3143';

	function deriveCoordinateId(name, lat, lon) {
		const slug = String(name)
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
		return `${slug || 'location'}-${String(lat).replace('.', '_')}-${String(lon).replace('.', '_')}`;
	}

	function isWithinNcrBounds(lat, lon) {
		if (!strictNcrBounds) return true;
		return strictNcrBounds.contains(L.latLng(lat, lon));
	}

	function addSavedMarkers() {
		if (!map || !L || !Array.isArray(data?.rows)) return;
		savedMarkers.forEach((item) => map.removeLayer(item));
		savedMarkers = [];

		for (const row of data.rows) {
			if (!Number.isFinite(Number(row.latitude)) || !Number.isFinite(Number(row.longitude)))
				continue;
			const saved = L.circleMarker([Number(row.latitude), Number(row.longitude)], {
				radius: 5,
				weight: 2,
				color: BRAND_DARK,
				fillColor: '#ffffff',
				fillOpacity: 1
			});
			saved.bindPopup(
				`<strong>${row.location_name}</strong><br/><code>${row.coordinate_id}</code>`
			);
			saved.addTo(map);
			savedMarkers.push(saved);
		}
	}

	async function setLocationFromPoint(lat, lon, providedName = null) {
		latitude = String(lat);
		longitude = String(lon);
		helperMessage = '';

		if (providedName) {
			locationName = providedName;
		} else {
			isResolvingName = true;
			try {
				const resolvedName =
					(await getLocationName(lat, lon)) || `Pinned Location (${lat}, ${lon})`;
				locationName = resolvedName;
			} catch {
				locationName = `Pinned Location (${lat}, ${lon})`;
			} finally {
				isResolvingName = false;
			}
		}

		coordinateId = deriveCoordinateId(locationName, lat, lon);
	}

	function placeOrMoveMarker(lat, lon) {
		if (marker) {
			marker.setLatLng([lat, lon]);
		} else {
			marker = L.circleMarker([lat, lon], {
				radius: 8,
				weight: 2,
				color: BRAND_GREEN,
				fillColor: BRAND_GREEN,
				fillOpacity: 0.95
			}).addTo(map);
		}
	}

	async function handlePointSelection(lat, lon, providedName = null) {
		if (!isWithinNcrBounds(lat, lon)) {
			helperMessage = 'Location is outside NCR bounds. Please pick a point within Metro Manila.';
			return;
		}

		await setLocationFromPoint(lat, lon, providedName);
		placeOrMoveMarker(lat, lon);
		map.panTo([lat, lon]);
	}

	async function handleSearchLocation(event) {
		const lat = Number(event.detail?.lat);
		const lon = Number(event.detail?.lng);
		const name = event.detail?.name ? String(event.detail.name) : null;
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
		await handlePointSelection(Number(lat.toFixed(6)), Number(lon.toFixed(6)), name);
	}

	onMount(async () => {
		L = await import('leaflet');

		const geojsonData = await loadGeoJSON();
		if (geojsonData) {
			const tempLayer = L.geoJSON(geojsonData);
			strictNcrBounds = tempLayer.getBounds();
			paddedNcrBounds = strictNcrBounds.pad(0.4);
		} else {
			strictNcrBounds = L.latLngBounds(L.latLng(14.35, 120.9), L.latLng(14.75, 121.15));
			paddedNcrBounds = strictNcrBounds.pad(0.2);
		}

		map = L.map(mapHost, {
			zoomControl: true,
			center: paddedNcrBounds.getCenter(),
			maxBounds: paddedNcrBounds,
			zoom: 11,
			minZoom: 10,
			maxBoundsViscosity: 0.9
		});

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		}).addTo(map);

		if (geojsonData) {
			L.geoJSON(geojsonData, {
				style: {
					color: BRAND_DARK,
					weight: 2,
					opacity: 0.5,
					fillOpacity: 0
				},
				interactive: false
			}).addTo(map);
		}

		addSavedMarkers();

		map.on('click', async (event) => {
			const lat = Number(event.latlng.lat.toFixed(6));
			const lon = Number(event.latlng.lng.toFixed(6));
			await handlePointSelection(lat, lon);
		});

		setTimeout(() => map.invalidateSize(), 80);
	});

	$: if (locationName && latitude && longitude) {
		coordinateId = deriveCoordinateId(locationName, latitude, longitude);
	}

	async function logout() {
		await fetch('/api/internal/auth/logout', { method: 'POST' });
		window.location.href = '/internal/login';
	}
</script>

<svelte:head>
	<title>Internal Coordinates | APAW</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-6">
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-[var(--brand-dark)]">Automated Coordinates</h1>
			<p class="text-sm text-gray-700">
				Search or click the map to auto-fill location name and coordinates, then save.
			</p>
		</div>
		<button
			on:click={logout}
			class="rounded-md border border-[var(--brand-dark)] px-3 py-2 text-sm text-[var(--brand-dark)]"
		>
			Logout
		</button>
	</div>

	{#if data.loadError}
		<p class="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
			{data.loadError}
		</p>
	{/if}
	{#if helperMessage}
		<p class="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
			{helperMessage}
		</p>
	{/if}

	<div class="grid gap-4 lg:grid-cols-3">
		<div class="lg:col-span-2">
			<div
				class="map-shell relative h-[560px] w-full overflow-hidden rounded-lg border border-[var(--brand-dark)] bg-white"
			>
				<div class="search-overlay pointer-events-none">
					<div class="pointer-events-auto">
						<MapSearchBar on:selectLocation={handleSearchLocation} />
					</div>
				</div>
				<div bind:this={mapHost} class="h-full w-full"></div>
			</div>
		</div>

		<div class="rounded-lg border border-[var(--brand-dark)] bg-white p-4">
			<form method="POST" action="?/add" use:enhance>
				<label class="mb-1 block text-sm font-medium text-[var(--brand-dark)]">Location Name</label>
				<input
					type="text"
					name="location_name"
					bind:value={locationName}
					required
					class="mb-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
				/>
				<p class="mb-3 text-xs text-gray-500">
					{isResolvingName
						? 'Resolving location name...'
						: 'Auto-filled from map click/search, editable.'}
				</p>

				<label class="mb-1 block text-sm font-medium text-[var(--brand-dark)]">Coordinate ID</label>
				<input
					type="text"
					name="coordinate_id"
					bind:value={coordinateId}
					required
					class="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
				/>

				<label class="mb-1 block text-sm font-medium text-[var(--brand-dark)]">Latitude</label>
				<input
					type="number"
					step="any"
					name="latitude"
					bind:value={latitude}
					required
					class="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm"
				/>

				<label class="mb-1 block text-sm font-medium text-[var(--brand-dark)]">Longitude</label>
				<input
					type="number"
					step="any"
					name="longitude"
					bind:value={longitude}
					required
					class="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm"
				/>

				<button
					class="w-full rounded bg-[var(--brand-green)] px-4 py-2 text-sm font-semibold text-white"
					type="submit">Add / Update</button
				>
			</form>
		</div>
	</div>

	<div class="mt-6 overflow-hidden rounded-lg border border-[var(--brand-dark)]">
		<table class="w-full text-sm">
			<thead class="bg-[var(--brand-dark)] text-white">
				<tr>
					<th class="px-3 py-2 text-left">ID</th>
					<th class="px-3 py-2 text-left">Location</th>
					<th class="px-3 py-2 text-left">Lat</th>
					<th class="px-3 py-2 text-left">Lon</th>
					<th class="px-3 py-2 text-right">Action</th>
				</tr>
			</thead>
			<tbody>
				{#if data.rows?.length}
					{#each data.rows as row}
						<tr class="border-t border-gray-200 bg-white">
							<td class="px-3 py-2 font-mono text-xs">{row.coordinate_id}</td>
							<td class="px-3 py-2">{row.location_name}</td>
							<td class="px-3 py-2">{row.latitude}</td>
							<td class="px-3 py-2">{row.longitude}</td>
							<td class="px-3 py-2 text-right">
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="id" value={row.id} />
									<button
										class="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
										type="submit">Remove</button
									>
								</form>
							</td>
						</tr>
					{/each}
				{:else}
					<tr
						><td colspan="5" class="px-3 py-6 text-center text-gray-500">No coordinates yet.</td
						></tr
					>
				{/if}
			</tbody>
		</table>
	</div>
</div>

<style>
	@import 'leaflet/dist/leaflet.css';

	:global(:root) {
		--brand-green: #3ba630;
		--brand-dark: #0c3143;
	}

	.map-shell :global(.leaflet-container) {
		height: 100%;
		width: 100%;
	}

	.map-shell :global(.leaflet-pane),
	.map-shell :global(.leaflet-control-container) {
		z-index: 1;
	}

	.search-overlay {
		position: absolute;
		top: 10px;
		left: 10px;
		right: 10px;
		z-index: 1000;
		max-width: 420px;
	}

	@media (max-width: 640px) {
		.search-overlay {
			max-width: 100%;
			top: 10px;
			left: 8px;
			right: 70px;
			width: calc(100% - 80px);
		}
	}
</style>
