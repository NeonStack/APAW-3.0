<script>
	import Icon from '@iconify/svelte';

	export let locationLoadingState = false;
	export let locationLoadingMessage = '';
	export let selectedLocation = null;
	export let nearestWaterStation = null;
	export let facilitiesLayerActive = false;
	export let nearestFacilities = [];
	export let expandedFacilities = {};
	export let onToggleFacility = () => {};

	function formatDistance(distance) {
		if (distance === null || distance === undefined) return 'Unknown';
		return `${Math.round(distance)}m`;
	}

	function formatPropertyValue(value) {
		if (typeof value !== 'string') return value;
		return value
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	function getFormattedAddress(properties) {
		if (!properties) return null;
		const addressParts = [];

		if (properties['addr:housenumber'] && properties['addr:street']) {
			addressParts.push(`${properties['addr:housenumber']} ${properties['addr:street']}`);
		} else if (properties['addr:street']) {
			addressParts.push(properties['addr:street']);
		}

		if (properties['addr:city']) {
			addressParts.push(properties['addr:city']);
		} else if (properties['addr:district']) {
			addressParts.push(properties['addr:district']);
		}

		if (properties['addr:province']) {
			addressParts.push(properties['addr:province']);
		}

		if (properties['addr:postcode']) {
			addressParts.push(properties['addr:postcode']);
		}

		return addressParts.length > 0 ? addressParts.join(', ') : null;
	}

	function getAdditionalProperties(properties) {
		if (!properties) return [];

		const additionalProps = [];
		const usedKeys = new Set();
		const propertyMappings = [
			{ label: 'Type', keys: ['amenity', 'leisure', 'emergency', 'healthcare'] },
			{ label: 'Capacity (Persons)', keys: ['capacity:persons', 'capacity'] },
			{ label: 'Operator', keys: ['operator'] },
			{ label: 'Operator Type', keys: ['operator:type'] },
			{ label: 'Building Levels', keys: ['building:levels'] },
			{ label: 'Height (m)', keys: ['height'] },
			{ label: 'Evacuation Center', keys: ['evacuation_center'], filterValue: 'yes' },
			{ label: 'DOH Reference', keys: ['ref:doh'] }
		];

		propertyMappings.forEach((mapping) => {
			for (const key of mapping.keys) {
				if (properties[key] && !usedKeys.has(key)) {
					if (mapping.filterValue && properties[key] !== mapping.filterValue) {
						continue;
					}

					additionalProps.push({
						label: mapping.label,
						value: formatPropertyValue(properties[key])
					});

					mapping.keys.forEach((k) => usedKeys.add(k));
					return;
				}
			}
		});

		return additionalProps;
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
	<div class="border-b border-gray-200 bg-gray-50 p-3">
		<h3 class="text-primary flex items-center text-sm font-bold">
			<Icon icon="mdi:map-marker" class="mr-2" width="16" />
			Location Information
		</h3>
	</div>

	<div class="p-3">
		{#if locationLoadingState}
			<div class="flex items-center py-3">
				<Icon icon="eos-icons:loading" class="mr-2 animate-spin text-blue-500" width="16" />
				<div>
					<p class="text-sm font-semibold text-blue-700">Loading...</p>
					<p class="text-xs text-blue-600">{locationLoadingMessage || 'Fetching data...'}</p>
				</div>
			</div>
		{:else if !selectedLocation?.lat}
			<div
				class="flex items-center rounded border-2 border-dashed border-yellow-300 bg-yellow-50 p-3"
			>
				<Icon icon="mdi:gesture-tap" class="mr-2 flex-shrink-0 text-yellow-600" width="20" />
				<div>
					<p class="text-sm font-semibold text-gray-800">No Location Selected</p>
					<p class="text-xs text-gray-600">Click on map or use search</p>
				</div>
			</div>
		{:else}
			<div class="space-y-3">
				{#if selectedLocation.locationName}
					<div class="rounded bg-gray-50 p-2">
						<p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
							Selected Location
						</p>
						<p class="text-sm font-bold text-gray-800">{selectedLocation.locationName}</p>
					</div>
				{/if}

				<div class="space-y-1">
					<div class="flex justify-between text-xs">
						<span class="font-medium text-gray-600">Coordinates:</span>
						<span class="font-mono text-gray-800"
							>{selectedLocation.lat}, {selectedLocation.lng}</span
						>
					</div>
				</div>

				{#if nearestWaterStation}
					<div class="rounded border border-blue-200 bg-blue-50 p-2">
						<div class="flex items-center justify-between">
							<div class="flex items-center">
								<Icon icon="mdi:water" class="mr-2 text-blue-600" width="14" />
								<div>
									<p class="text-xs font-semibold text-blue-500">Water Station</p>
									<p class="text-sm font-bold text-blue-800">{nearestWaterStation.obsnm}</p>
									{#if nearestWaterStation.wl}
										<p class="text-xs text-blue-700">Level: {nearestWaterStation.wl} m</p>
									{/if}
								</div>
							</div>
							<span class="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-bold text-blue-800">
								{formatDistance(nearestWaterStation.distance)}
							</span>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<div class="border-t border-gray-200 bg-gray-50 p-3">
		<h4 class="text-primary mb-2 flex items-center text-sm font-bold">
			<Icon icon="mdi:near-me" class="mr-2" width="14" />
			Nearby Facilities
		</h4>
		{#if !facilitiesLayerActive}
			<div
				class="flex items-center rounded border-2 border-dashed border-yellow-300 bg-yellow-50 p-3"
			>
				<Icon icon="mdi:layers-off" class="mr-2 flex-shrink-0 text-yellow-600" width="20" />
				<div>
					<p class="text-sm font-semibold text-gray-800">"Nearby Facilities" Is Disabled</p>
					<p class="text-xs text-gray-600">Enable "Nearby Facilities" Layer</p>
				</div>
			</div>
		{:else if nearestFacilities.length > 0}
			<div class="space-y-2">
				{#each nearestFacilities as facility}
					<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
						<button
							onclick={() => onToggleFacility(facility.id)}
							class="flex w-full cursor-pointer items-center p-2.5 text-left transition-colors duration-150 hover:bg-gray-50"
						>
							<div
								class="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
								style="background-color: {facility.color || '#777'};"
							>
								<Icon icon={facility.icon || 'mdi:map-marker'} class="text-white" width="20" />
							</div>

							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-bold text-gray-800">{facility.name}</p>
								<p class="truncate text-xs text-gray-500">{facility.type}</p>
							</div>

							<div class="ml-2 flex flex-shrink-0 items-center">
								<span
									class="mr-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700"
								>
									{formatDistance(facility.distance)}
								</span>
								<Icon
									icon={expandedFacilities[facility.id] ? 'mdi:chevron-up' : 'mdi:chevron-down'}
									width="18"
									class="text-gray-500 transition-transform"
									style={expandedFacilities[facility.id] ? 'transform: rotate(0deg);' : ''}
								/>
							</div>
						</button>

						{#if expandedFacilities[facility.id] && facility.properties}
							{@const address = getFormattedAddress(facility.properties)}
							{@const details = getAdditionalProperties(facility.properties)}
							<div class="border-t border-gray-200 bg-gray-50 p-3 text-xs">
								{#if address}
									<div class="mb-2">
										<h5 class="mb-1 flex items-center font-semibold text-gray-600">
											<Icon icon="mdi:map-marker-outline" class="mr-1.5" width="14" />
											Address
										</h5>
										<p class="pl-5 break-words text-gray-800">{address}</p>
									</div>
								{/if}

								{#if details.length > 0}
									<div class="mb-2">
										<h5 class="mb-1 flex items-center font-semibold text-gray-600">
											<Icon icon="mdi:information-outline" class="mr-1.5" width="14" />
											Details
										</h5>
										<div class="space-y-1 pl-5">
											{#each details as prop}
												<div class="flex gap-1">
													<span class="text-gray-500">{prop.label}:</span>
													<span class="font-medium text-gray-800">{prop.value}</span>
												</div>
											{/each}
										</div>
									</div>
								{/if}

								{#if !address && details.length === 0}
									<p class="text-center text-gray-500">No additional info available</p>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="rounded border border-gray-200 bg-gray-100 p-3 text-center">
				<Icon icon="mdi:map-search" class="mx-auto mb-1 text-gray-400" width="20" />
				<p class="text-sm text-gray-600">No facilities found nearby</p>
			</div>
		{/if}
	</div>
</div>
