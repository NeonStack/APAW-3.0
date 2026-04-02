<script>
	import Icon from '@iconify/svelte';

	export let onPredict = () => {};
	export let isPredicting = false;
	export let hasLocation = false;
	export let locationLoadingState = false;
	export let predictionError = null;
	export let predictionErrorDetails = null;

	function getErrorTypeDisplay(errorType) {
		const typeMap = {
			outside_service_area: {
				icon: 'mdi:map-marker-off',
				color: 'orange',
				label: 'Outside Service Area'
			},
			invalid_location: { icon: 'mdi:water-alert', color: 'blue', label: 'Invalid Location' },
			default: { icon: 'mdi:alert-circle', color: 'red', label: 'Error' }
		};
		return typeMap[errorType] || typeMap.default;
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
		return directionMap[direction?.toLowerCase()] || 'mdi:compass';
	}

	$: errorDisplay = predictionErrorDetails
		? getErrorTypeDisplay(predictionErrorDetails.error_type)
		: getErrorTypeDisplay('default');
</script>

<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-black/5">
	<div class="flex items-center justify-between border-b border-gray-100 bg-slate-50 px-3.5 py-2.5">
		<div class="flex items-center gap-4">
			<div
				class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 ring-1 ring-blue-200"
			>
				<Icon icon="mdi:chart-box-outline" width="16" />
			</div>
			<h3 class="text-sm font-bold text-gray-800">APAW Flood Prediction</h3>
		</div>
		<div class="flex items-center rounded bg-gray-200/60 px-2 py-0.5 text-[10px] font-medium text-gray-600">
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
								class:text-orange-800={errorDisplay.color === 'orange'}
								class:text-blue-800={errorDisplay.color === 'blue'}
								class:text-red-800={errorDisplay.color === 'red'}
							>
								{errorDisplay.label}
							</p>
							<p
								class="mt-1 text-xs"
								class:text-orange-700={errorDisplay.color === 'orange'}
								class:text-blue-700={errorDisplay.color === 'blue'}
								class:text-red-700={errorDisplay.color === 'red'}
							>
								{predictionError}
							</p>

							{#if predictionErrorDetails}
								<div class="mt-2 space-y-1">
									{#if predictionErrorDetails.reason === 'water_body'}
										<div class="rounded border border-blue-200 bg-blue-100 p-2">
											<p class="text-xs font-semibold text-blue-800">Location Details:</p>
											<div class="mt-1 ml-4 space-y-0.5 text-xs text-blue-700">
												<p>
													<span class="font-medium">Type:</span>
													{predictionErrorDetails.water_type
														?.replace('water_', '')
														.replace('_', ' ') || 'Water body'}
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
										<div class="rounded border border-orange-200 bg-orange-100 p-2">
											<p class="text-xs font-semibold text-orange-800">
												Distance from Service Area:
											</p>
											<div class="mt-1 ml-4 space-y-0.5 text-xs text-orange-700">
												<p class="flex items-center">
													<Icon
														icon={getDirectionIcon(predictionErrorDetails.direction)}
														class="mr-1"
														width="12"
													/>
													<span class="font-bold"
														>{Math.round(predictionErrorDetails.distance_to_boundary_m)}m</span
													>
													<span class="ml-1">{predictionErrorDetails.direction}</span>
												</p>
											</div>
										</div>
									{/if}

									{#if predictionErrorDetails.suggestion}
										<div
											class="rounded border p-2"
											class:border-orange-200={errorDisplay.color === 'orange'}
											class:bg-orange-100={errorDisplay.color === 'orange'}
											class:border-blue-200={errorDisplay.color === 'blue'}
											class:bg-blue-100={errorDisplay.color === 'blue'}
										>
											<p
												class="flex items-start text-xs"
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
