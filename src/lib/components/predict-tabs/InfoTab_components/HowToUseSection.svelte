<script>
	import Icon from '@iconify/svelte';

	let isOpen = false;

	const steps = [
		{ title: 'Select Location', description: 'Click on Map or Search' },
		{ title: 'Get Prediction', description: 'Click "Generate Prediction"' },
		{ title: 'Review Results', description: 'See 5-day Predictions' },
		{ title: 'Explore Data', description: 'Click "Show Details"' }
	];
</script>

<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
	<button
		type="button"
		onclick={() => (isOpen = !isOpen)}
		class={`bg-primary flex w-full cursor-pointer items-center justify-between p-3 text-left ${
			isOpen ? 'rounded-t-lg' : 'rounded-lg'
		}`}
		aria-expanded={isOpen}
	>
		<h3 class="flex items-center text-sm font-bold text-white">
			<Icon icon="mdi:help-circle-outline" class="mr-2" width="16" />
			How to Use
		</h3>
		<Icon icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} class="text-white" width="18" />
	</button>

	{#if isOpen}
		<div class="p-3">
			<div class="space-y-2">
				{#each steps as step, index}
					<div class="flex items-start rounded border border-blue-200 bg-blue-50 p-2">
						<div
							class="bg-primary mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
						>
							{index + 1}
						</div>
						<div>
							<p class="text-xs font-bold text-gray-800">{step.title}</p>
							<p class="text-xs text-gray-600">{step.description}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
