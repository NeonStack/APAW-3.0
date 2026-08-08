<script>
	import Icon from '@iconify/svelte';

	export let onPredict = () => {};
	export let isPredicting = false;
	export let hasLocation = false;
	export let locationLoadingState = false;
	export let predictionError = null;
	export let predictionErrorDetails = null;

	function getErrorTypeDisplay(errorType, reason) {
		const normalizedType = String(errorType || '')
			.trim()
			.toLowerCase();
		const normalizedReason = String(reason || '')
			.trim()
			.toLowerCase();

		if (normalizedType === 'outside_service_area' || normalizedReason === 'outside_metro_manila') {
			return {
				icon: 'mdi:map-marker-off',
				color: 'yellow',
				label: 'Invalid Input'
			};
		}

		if (normalizedType === 'invalid_location' || normalizedReason === 'water_body') {
			return {
				icon: 'mdi:water-alert',
				color: 'yellow',
				label: 'Invalid Input'
			};
		}

		return { icon: 'mdi:alert-circle', color: 'red', label: 'Error' };
	}

	function toSentenceCase(value) {
		const normalized = String(value || '')
			.trim()
			.toLowerCase();
		if (!normalized) return '';
		return normalized.charAt(0).toUpperCase() + normalized.slice(1);
	}

	function formatWaterTypeLabel(waterType) {
		const normalized = String(waterType || '')
			.trim()
			.toLowerCase()
			.replace(/^water[_-]?/, '')
			.replace(/[_-]+/g, ' ');

		return toSentenceCase(normalized) || 'Water body';
	}

	function formatDirectionLabel(direction) {
		const normalized = String(direction || '')
			.trim()
			.toLowerCase()
			.replace(/[_\s]+/g, '-');

		return toSentenceCase(normalized);
	}

	function getDirectionIcon(direction) {
		const directionMap = {
			north: 'mdi:arrow-up',
			south: 'mdi:arrow-down',
			east: 'mdi:arrow-right',
			west: 'mdi:arrow-left',
			northeast: 'mdi:arrow-top-right',
			northwest: 'mdi:arrow-top-left',
			southeast: 'mdi:arrow-bottom-right',
			southwest: 'mdi:arrow-bottom-left'
		};

		const directionKey = String(direction || '')
			.trim()
			.toLowerCase()
			.replace(/[_\s-]+/g, '');

		return directionMap[directionKey] || 'mdi:compass';
	}

	$: errorDisplay = predictionErrorDetails
		? getErrorTypeDisplay(predictionErrorDetails.error_type, predictionErrorDetails.reason)
		: getErrorTypeDisplay('default');
</script>

<div
	class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/5"
>
	<div class="flex items-center justify-between border-b border-gray-100 bg-slate-50 px-3.5 py-2.5">
		<div class="flex items-center gap-4">
			<div
				class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 ring-1 ring-blue-200"
			>
				<img src="/APAW_SHORT_TRANSPARENT.webp" alt="APAW logo" class="h-fit drop-shadow-md" />
			</div>
			<h3 class="text-sm font-bold text-gray-800">Flood Prediction</h3>
		</div>
		<div
			class="flex items-center rounded bg-gray-200/60 px-2 py-0.5 text-[10px] font-medium text-gray-600"
		>
			<Icon icon="mdi:cpu-64-bit" class="mr-1" width="12" />
			RF + LSTM
		</div>
	</div>

	<div class="space-y-3 p-3.5 pt-4">
		<button
			onclick={onPredict}
			disabled={isPredicting || !hasLocation || locationLoadingState}
			class="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if isPredicting}
				<Icon icon="eos-icons:loading" class="animate-spin text-blue-300" width="18" />
				<span class="tracking-wide">Analyzing Models...</span>
			{:else}
				<span class="tracking-wide">Generate Prediction</span>
			{/if}
		</button>

		{#if predictionError}
			<div
				class="rounded-lg border-2 shadow-sm"
				class:border-yellow-300={errorDisplay.color === 'yellow'}
				class:bg-yellow-50={errorDisplay.color === 'yellow'}
				class:border-orange-300={errorDisplay.color === 'orange'}
				class:bg-orange-50={errorDisplay.color === 'orange'}
				class:border-blue-300={errorDisplay.color === 'blue'}
				class:bg-blue-50={errorDisplay.color === 'blue'}
				class:border-red-300={errorDisplay.color === 'red'}
				class:bg-red-50={errorDisplay.color === 'red'}
			>
				<div class="p-3">
					<div class="flex items-start">
						<div class="flex-1">
							<p
								class="text-sm font-bold"
								class:text-yellow-800={errorDisplay.color === 'yellow'}
								class:text-orange-800={errorDisplay.color === 'orange'}
								class:text-blue-800={errorDisplay.color === 'blue'}
								class:text-red-800={errorDisplay.color === 'red'}
							>
								{errorDisplay.label}
							</p>
							<p
								class="mt-1 text-xs"
								class:text-yellow-700={errorDisplay.color === 'yellow'}
								class:text-orange-700={errorDisplay.color === 'orange'}
								class:text-blue-700={errorDisplay.color === 'blue'}
								class:text-red-700={errorDisplay.color === 'red'}
							>
								{predictionError}
							</p>

							{#if predictionErrorDetails}
								<div class="mt-2 space-y-1">
									{#if predictionErrorDetails.reason === 'water_body'}
										<div class="rounded border border-yellow-200 bg-yellow-100 p-2">
											<p class="text-xs font-semibold text-yellow-800">Location Details:</p>
											<div class="mt-1 space-y-0.5 text-xs text-yellow-700">
												<p>
													<span class="font-medium">Type:</span>
													{formatWaterTypeLabel(predictionErrorDetails.water_type)}
												</p>
												{#if predictionErrorDetails.water_name && predictionErrorDetails.water_name !== 'Unnamed Stream' && predictionErrorDetails.water_name !== 'Unnamed River'}
													<p>
														<span class="font-medium">Name:</span>
														{predictionErrorDetails.water_name}
													</p>
												{/if}
											</div>
										</div>
									{/if}

									{#if predictionErrorDetails.reason === 'outside_metro_manila'}
										<div class="rounded border border-yellow-200 bg-yellow-100 p-2">
											<p class="text-xs font-semibold text-yellow-800">
												Distance from Service Area:
											</p>
											<div class="mt-1 space-y-0.5 text-xs text-yellow-700">
												<p class="flex items-center">
													<Icon
														icon={getDirectionIcon(predictionErrorDetails.direction)}
														class="mr-1"
														width="12"
													/>
													<span class="font-bold"
														>{Math.round(predictionErrorDetails.distance_to_boundary_m)}m</span
													>
													<span class="ml-1"
														>{formatDirectionLabel(predictionErrorDetails.direction)}</span
													>
												</p>
											</div>
										</div>
									{/if}

									{#if predictionErrorDetails.suggestion}
										<div
											class="rounded border p-2"
											class:border-yellow-200={errorDisplay.color === 'yellow'}
											class:bg-yellow-100={errorDisplay.color === 'yellow'}
											class:border-orange-200={errorDisplay.color === 'orange'}
											class:bg-orange-100={errorDisplay.color === 'orange'}
											class:border-blue-200={errorDisplay.color === 'blue'}
											class:bg-blue-100={errorDisplay.color === 'blue'}
										>
											<p
												class="flex items-start text-xs"
												class:text-yellow-700={errorDisplay.color === 'yellow'}
												class:text-orange-700={errorDisplay.color === 'orange'}
												class:text-blue-700={errorDisplay.color === 'blue'}
											>
												<Icon
													icon="mdi:lightbulb-on-outline"
													class="mt-0.5 mr-1 flex-shrink-0"
													width="12"
												/>
												<span class="font-medium">{predictionErrorDetails.suggestion}</span>
											</p>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
