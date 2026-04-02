<script>
	import Icon from '@iconify/svelte';
</script>

<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
	<div class="from-primary to-primary/90 bg-gradient-to-r p-3">
		<h3 class="flex items-center text-sm font-bold text-white">
			<Icon icon="mdi:help-circle-outline" class="mr-2" width="16" />
			How to Use
		</h3>
	</div>

	<div class="p-3">
		<div class="space-y-2">
			<div class="flex items-start rounded border border-blue-200 bg-blue-50 p-2">
				<div
					class="bg-primary mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
				>
					1
				</div>
				<div>
					<p class="text-xs font-bold text-gray-800">Select Location</p>
					<p class="text-xs text-gray-600">Click on Map or Search</p>
				</div>
			</div>
			<div class="flex items-start rounded border border-blue-200 bg-blue-50 p-2">
				<div
					class="bg-primary mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
				>
					2
				</div>
				<div>
					<p class="text-xs font-bold text-gray-800">Get Prediction</p>
					<p class="text-xs text-gray-600">Click "Generate Prediction"</p>
				</div>
			</div>
			<div class="flex items-start rounded border border-blue-200 bg-blue-50 p-2">
				<div
					class="bg-primary mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
				>
					3
				</div>
				<div>
					<p class="text-xs font-bold text-gray-800">Review Results</p>
					<p class="text-xs text-gray-600">See 5-day Predictions</p>
				</div>
			</div>
			<div class="flex items-start rounded border border-blue-200 bg-blue-50 p-2">
				<div
					class="bg-primary mr-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
				>
					4
				</div>
				<div>
					<p class="text-xs font-bold text-gray-800">Explore Data</p>
					<p class="text-xs text-gray-600">Click "Show Details"</p>
				</div>
			</div>
		</div>
	</div>
</div>
