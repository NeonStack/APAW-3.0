<script>
	import Icon from '@iconify/svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let isPredicting = false;
	export let locationLoadingMessage = '';
	export let fakeProgress = 0;

	function formatProgress(progress) {
		return Math.round(progress) + '%';
	}

	function getProgressBarColor(progress) {
		if (progress < 30) return 'bg-blue-400';
		if (progress < 60) return 'bg-blue-500';
		if (progress < 90) return 'bg-blue-600';
		return 'bg-green-500';
	}

	function handleProgressTransitionEnd(event) {
		if (event.propertyName !== 'width') return;
		if (fakeProgress >= 100) {
			dispatch('completionVisible');
		}
	}
</script>

{#if isPredicting}
	<div class="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm ring-1 ring-blue-50">
		<div class="bg-blue-50/50 p-3.5">
			<div class="mb-3 flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 ring-2 ring-blue-50"
					>
						<Icon icon="line-md:loading-twotone-loop" class="text-blue-600" width="18" />
					</div>
					<div>
						<p class="text-sm font-bold tracking-tight text-blue-900">Running Models</p>
						<p class="text-[11px] font-medium text-blue-600">
							{locationLoadingMessage || 'Fetching location data...'}
						</p>
					</div>
				</div>
				<div class="text-right">
					<div class="text-lg font-black tracking-tighter text-blue-600 tabular-nums">
						{formatProgress(fakeProgress)}
					</div>
				</div>
			</div>

			<div class="relative mb-3 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
				<div
					class={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-out ${getProgressBarColor(fakeProgress)}`}
					style={`width: ${fakeProgress}%;`}
					on:transitionend={handleProgressTransitionEnd}
				>
					<div
						class="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/30 to-transparent"
					></div>
				</div>
			</div>

			<div class="rounded-lg border border-white bg-white/80 px-2.5 py-1.5 shadow-sm">
				<p class="flex items-center text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
					<Icon icon="mdi:cogs" class="mr-1.5 text-blue-500" width="14" />
					{#if fakeProgress < 30}
						Gathering environmental data...
					{:else if fakeProgress < 70}
						Processing terrain analysis...
					{:else if fakeProgress < 91}
						Executing RF + LSTM Inference...
					{:else}
						Finalizing predictive outputs...
					{/if}
				</p>
			</div>
		</div>
	</div>
{/if}
