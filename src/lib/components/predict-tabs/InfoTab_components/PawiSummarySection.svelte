<script>
	export let hasPrediction = false;
	export let loading = false;
	export let error = null;
	export let summary = null;
	export let source = null;
	export let updatedAt = null;
	export let hasRequested = false;
	export let canSummarize = false;
	export let onSummarize = () => {};

	function formatDateTime(dateString) {
		if (!dateString) return 'Not available';
		const date = new Date(dateString);
		if (Number.isNaN(date.getTime())) return 'Not available';
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getPawiSourceLabel(value) {
		return value === 'fallback' ? 'Local' : 'Pawi';
	}

	$: hasSummary = typeof summary === 'string' && summary.trim().length > 0;
</script>

<div class="rounded-xl border border-emerald-200 bg-white p-2.5 shadow-sm">
	<div class="flex items-center justify-between gap-2">
		<div class="flex min-w-0 items-center gap-2">
			{#if hasSummary}
				<img src={'/pawi/pawi-teach.svg'} alt="Pawi" class="h-9 w-9 shrink-0" />
			{:else}
				<img src={'/pawi/pawi-idle.svg'} alt="Pawi" class="h-9 w-9 shrink-0" />
			{/if}
			<div class="min-w-0">
				<p class="truncate text-sm font-bold text-emerald-800">Pawi Summarize</p>
				<p class="truncate text-xs text-emerald-700">
					{#if loading}
						Pawi is reading your forecast...
					{:else if hasSummary}
						Summary generated for this prediction.
					{:else if hasRequested}
						Summary request already used for this prediction.
					{:else}
						Summarize results with Pawi.
					{/if}
				</p>
			</div>
		</div>

		{#if canSummarize && hasPrediction && !loading}
			<button
				type="button"
				onclick={onSummarize}
				class="shrink-0 cursor-pointer rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
				disabled={!hasPrediction}
			>
				Summarize with Pawi
			</button>
		{/if}
	</div>

	{#if loading || error || hasSummary || hasRequested}
		<div
			class="mt-2 rounded-lg border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-3"
		>
			{#if loading}
				<div class="flex items-start gap-2">
					<p class="text-sm text-emerald-700">
						Pawi is reading your prediction data and preparing a clear summary.
					</p>
				</div>
			{:else if error}
				<div class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
					{error}
				</div>
			{:else if hasSummary}
				<div class="flex items-start gap-2">
					<div class="min-w-0">
						<p class="text-sm leading-relaxed text-slate-700">{summary}</p>
						<div class="mt-2 flex items-center justify-between text-[10px] text-slate-500">
							<span>Source: {getPawiSourceLabel(source)}</span>
							<span>Updated: {formatDateTime(updatedAt)}</span>
						</div>
					</div>
				</div>
			{:else}
				<p class="text-sm text-emerald-700">
					Pawi summary can only be requested once per prediction run.
				</p>
			{/if}
		</div>
	{/if}
</div>
