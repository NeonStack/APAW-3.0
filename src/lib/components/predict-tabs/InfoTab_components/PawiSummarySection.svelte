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
		return typeof value === 'string' && value.startsWith('fallback') ? 'Local' : 'Pawi';
	}

	$: hasSummary = typeof summary === 'string' && summary.trim().length > 0;
</script>

<div class="rounded-xl border border-emerald-200 bg-white p-2.5 shadow-sm">
	<div class="flex items-center justify-between gap-2">
		<div class="flex min-w-0 items-center gap-2">
			{#if hasSummary}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 400 400"
					class="pawi-icon pawi-teach h-9 w-9 shrink-0"
					role="img"
					aria-label="Pawi teach"
				>
					<g id="shell">
						<circle cx="200" cy="220" r="85" fill="#2E8B57" stroke="#1D3557" stroke-width="6" />
						<path
							d="M 125,200 Q 200,260 275,200"
							fill="none"
							stroke="#1D3557"
							stroke-width="6"
							stroke-linecap="round"
						/>
						<path
							d="M 155,150 L 165,220 M 245,150 L 235,220 M 200,135 L 200,235"
							stroke="#1D3557"
							stroke-width="6"
							stroke-linecap="round"
						/>
					</g>

					<g id="legs">
						<rect
							x="150"
							y="290"
							width="30"
							height="40"
							rx="15"
							fill="#A0E8AF"
							stroke="#1D3557"
							stroke-width="6"
						/>
						<rect
							x="220"
							y="290"
							width="30"
							height="40"
							rx="15"
							fill="#A0E8AF"
							stroke="#1D3557"
							stroke-width="6"
						/>
					</g>

					<g id="pointer">
						<line
							x1="310"
							y1="180"
							x2="360"
							y2="60"
							stroke="#1D3557"
							stroke-width="16"
							stroke-linecap="round"
						/>
						<line
							x1="310"
							y1="180"
							x2="360"
							y2="60"
							stroke="#4CAF50"
							stroke-width="8"
							stroke-linecap="round"
						/>
					</g>

					<g id="body">
						<rect
							x="135"
							y="190"
							width="130"
							height="110"
							rx="35"
							fill="#A8DADC"
							stroke="#1D3557"
							stroke-width="6"
						/>
						<path
							d="M 165,190 L 165,260 Q 200,285 235,260 L 235,190"
							fill="none"
							stroke="#457B9D"
							stroke-width="5"
						/>
						<line x1="200" y1="190" x2="200" y2="265" stroke="#457B9D" stroke-width="5" />
						<circle cx="200" cy="215" r="3" fill="#1D3557" />
						<circle cx="200" cy="235" r="3" fill="#1D3557" />
						<circle cx="200" cy="255" r="3" fill="#1D3557" />
						<path
							d="M 160,190 L 200,215 L 240,190"
							fill="none"
							stroke="#1D3557"
							stroke-width="6"
							stroke-linejoin="round"
						/>
					</g>

					<g id="arms">
						<path
							d="M 140,215 Q 100,240 120,270 Q 140,280 150,250"
							fill="none"
							stroke="#1D3557"
							stroke-width="32"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<path
							d="M 140,215 Q 100,240 120,270 Q 140,280 150,250"
							fill="none"
							stroke="#A0E8AF"
							stroke-width="20"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<g id="right-arm">
							<path
								d="M 260,215 Q 290,190 310,165"
								fill="none"
								stroke="#1D3557"
								stroke-width="32"
								stroke-linecap="round"
							/>
							<path
								d="M 260,215 Q 290,190 310,165"
								fill="none"
								stroke="#A0E8AF"
								stroke-width="20"
								stroke-linecap="round"
							/>
						</g>
					</g>

					<g id="head">
						<ellipse
							cx="200"
							cy="140"
							rx="95"
							ry="75"
							fill="#A0E8AF"
							stroke="#1D3557"
							stroke-width="6"
						/>

						<ellipse cx="135" cy="155" rx="16" ry="8" fill="#4CAF50" opacity="0.5" />
						<ellipse cx="265" cy="155" rx="16" ry="8" fill="#4CAF50" opacity="0.5" />

						<path
							d="M 140,135 Q 155,120 170,135"
							fill="none"
							stroke="#1D3557"
							stroke-width="7"
							stroke-linecap="round"
						/>
						<path
							d="M 230,135 Q 245,120 260,135"
							fill="none"
							stroke="#1D3557"
							stroke-width="7"
							stroke-linecap="round"
						/>

						<path
							d="M 185,160 Q 200,185 215,160 Z"
							fill="#1D3557"
							stroke="#1D3557"
							stroke-width="5"
							stroke-linejoin="round"
						/>
						<path d="M 192,168 Q 200,175 208,168 Z" fill="#A8DADC" />
					</g>

					<g id="hat" transform="rotate(4, 200, 100)">
						<path
							d="M 80,95 Q 200,-30 320,95 Q 200,125 80,95 Z"
							fill="#457B9D"
							stroke="#1D3557"
							stroke-width="6"
							stroke-linejoin="round"
						/>
						<path
							d="M 190,25 L 210,25 L 205,10 L 195,10 Z"
							fill="#2E8B57"
							stroke="#1D3557"
							stroke-width="6"
							stroke-linejoin="round"
						/>
						<path
							d="M 120,75 Q 200,30 280,75"
							fill="none"
							stroke="#1D3557"
							stroke-width="3"
							opacity="0.6"
						/>
						<path
							d="M 100,85 Q 200,50 300,85"
							fill="none"
							stroke="#1D3557"
							stroke-width="3"
							opacity="0.6"
						/>
						<path
							d="M 160,105 Q 200,50 240,105"
							fill="none"
							stroke="#1D3557"
							stroke-width="3"
							opacity="0.6"
						/>
						<line
							x1="200"
							y1="25"
							x2="200"
							y2="110"
							stroke="#1D3557"
							stroke-width="3"
							opacity="0.6"
						/>
					</g>
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 400 400"
					class="pawi-icon pawi-idle h-9 w-9 shrink-0"
					role="img"
					aria-label="Pawi idle"
				>
					<g id="shell">
						<circle cx="200" cy="220" r="85" fill="#2E8B57" stroke="#1D3557" stroke-width="6" />
						<path
							d="M 125,200 Q 200,260 275,200"
							fill="none"
							stroke="#1D3557"
							stroke-width="6"
							stroke-linecap="round"
						/>
						<path
							d="M 155,150 L 165,220 M 245,150 L 235,220 M 200,135 L 200,235"
							stroke="#1D3557"
							stroke-width="6"
							stroke-linecap="round"
						/>
					</g>

					<g id="legs">
						<rect
							x="150"
							y="290"
							width="30"
							height="40"
							rx="15"
							fill="#A0E8AF"
							stroke="#1D3557"
							stroke-width="6"
						/>
						<rect
							x="220"
							y="290"
							width="30"
							height="40"
							rx="15"
							fill="#A0E8AF"
							stroke="#1D3557"
							stroke-width="6"
						/>
					</g>

					<g id="body">
						<rect
							x="135"
							y="190"
							width="130"
							height="110"
							rx="35"
							fill="#A8DADC"
							stroke="#1D3557"
							stroke-width="6"
						/>
						<path
							d="M 165,190 L 165,260 Q 200,285 235,260 L 235,190"
							fill="none"
							stroke="#457B9D"
							stroke-width="5"
						/>
						<line x1="200" y1="190" x2="200" y2="265" stroke="#457B9D" stroke-width="5" />
						<circle cx="200" cy="215" r="3" fill="#1D3557" />
						<circle cx="200" cy="235" r="3" fill="#1D3557" />
						<circle cx="200" cy="255" r="3" fill="#1D3557" />
						<path
							d="M 160,190 L 200,215 L 240,190"
							fill="none"
							stroke="#1D3557"
							stroke-width="6"
							stroke-linejoin="round"
						/>
					</g>

					<g id="arms">
						<path
							d="M 140,215 Q 110,260 135,295"
							fill="none"
							stroke="#1D3557"
							stroke-width="32"
							stroke-linecap="round"
						/>
						<path
							d="M 140,215 Q 110,260 135,295"
							fill="none"
							stroke="#A0E8AF"
							stroke-width="20"
							stroke-linecap="round"
						/>
						<path
							d="M 260,215 Q 290,260 265,295"
							fill="none"
							stroke="#1D3557"
							stroke-width="32"
							stroke-linecap="round"
						/>
						<path
							d="M 260,215 Q 290,260 265,295"
							fill="none"
							stroke="#A0E8AF"
							stroke-width="20"
							stroke-linecap="round"
						/>
					</g>

					<g id="head">
						<ellipse
							cx="200"
							cy="140"
							rx="95"
							ry="75"
							fill="#A0E8AF"
							stroke="#1D3557"
							stroke-width="6"
						/>

						<ellipse cx="135" cy="155" rx="16" ry="8" fill="#4CAF50" opacity="0.5" />
						<ellipse cx="265" cy="155" rx="16" ry="8" fill="#4CAF50" opacity="0.5" />

						<circle cx="155" cy="135" r="15" fill="#1D3557" />
						<circle cx="159" cy="129" r="5" fill="#FFFFFF" />
						<circle cx="149" cy="139" r="2" fill="#FFFFFF" />

						<circle cx="245" cy="135" r="15" fill="#1D3557" />
						<circle cx="249" cy="129" r="5" fill="#FFFFFF" />
						<circle cx="239" cy="139" r="2" fill="#FFFFFF" />

						<path
							d="M 185,160 Q 200,175 215,160"
							fill="none"
							stroke="#1D3557"
							stroke-width="5"
							stroke-linecap="round"
						/>
					</g>

					<g id="hat">
						<path
							d="M 80,95 Q 200,-30 320,95 Q 200,125 80,95 Z"
							fill="#457B9D"
							stroke="#1D3557"
							stroke-width="6"
							stroke-linejoin="round"
						/>
						<path
							d="M 190,25 L 210,25 L 205,10 L 195,10 Z"
							fill="#2E8B57"
							stroke="#1D3557"
							stroke-width="6"
							stroke-linejoin="round"
						/>
						<path
							d="M 120,75 Q 200,30 280,75"
							fill="none"
							stroke="#1D3557"
							stroke-width="3"
							opacity="0.6"
						/>
						<path
							d="M 100,85 Q 200,50 300,85"
							fill="none"
							stroke="#1D3557"
							stroke-width="3"
							opacity="0.6"
						/>
						<path
							d="M 160,105 Q 200,50 240,105"
							fill="none"
							stroke="#1D3557"
							stroke-width="3"
							opacity="0.6"
						/>
						<line
							x1="200"
							y1="25"
							x2="200"
							y2="110"
							stroke="#1D3557"
							stroke-width="3"
							opacity="0.6"
						/>
					</g>
				</svg>
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

<style>
	.pawi-icon {
		will-change: transform;
	}

	.pawi-idle {
		transform-origin: center bottom;
		animation: pawi-hop 2.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
	}

	.pawi-idle #head {
		transform-box: fill-box;
		transform-origin: center;
		animation: pawi-head-nod 2.2s ease-in-out infinite;
	}

	.pawi-idle #arms {
		transform-box: fill-box;
		transform-origin: center top;
		animation: pawi-arm-lift-idle 2.2s ease-in-out infinite;
	}

	.pawi-teach {
		transform-origin: center bottom;
		animation: pawi-hop 2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
	}

	.pawi-teach #arms {
		transform-origin: 200px 220px;
		animation: pawi-arm-lift-teach 2s ease-in-out infinite;
	}

	.pawi-teach #pointer,
	.pawi-teach #right-arm {
		transform-origin: 260px 215px;
		animation: pawi-teach-swing 1.1s ease-in-out infinite;
	}

	@keyframes pawi-hop {
		0%,
		100% {
			transform: translateY(0) rotate(0deg) scale(1);
		}
		25% {
			transform: translateY(-3px) rotate(-1deg) scale(1.01);
		}
		50% {
			transform: translateY(0) rotate(0.5deg) scale(0.99);
		}
		75% {
			transform: translateY(-2px) rotate(0deg) scale(1.005);
		}
	}

	@keyframes pawi-head-nod {
		0%,
		100% {
			transform: rotate(0deg);
		}
		25% {
			transform: rotate(-4deg);
		}
		50% {
			transform: rotate(0deg);
		}
		75% {
			transform: rotate(3deg);
		}
	}

	@keyframes pawi-teach-swing {
		0%,
		100% {
			transform: rotate(8deg);
		}
		25% {
			transform: rotate(-15deg);
		}
		50% {
			transform: rotate(8deg);
		}
		75% {
			transform: rotate(-12deg);
		}
	}

	@keyframes pawi-arm-lift-idle {
		0%,
		100% {
			transform: translateY(0) rotate(0deg);
		}
		25% {
			transform: translateY(-16px) rotate(-10deg);
		}
		50% {
			transform: translateY(0) rotate(0deg);
		}
		75% {
			transform: translateY(-10px) rotate(6deg);
		}
	}

	@keyframes pawi-arm-lift-teach {
		0%,
		100% {
			transform: translateY(0) rotate(0deg);
		}
		25% {
			transform: translateY(-8px) rotate(-5deg);
		}
		50% {
			transform: translateY(0) rotate(0deg);
		}
		75% {
			transform: translateY(-5px) rotate(4deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pawi-icon,
		.pawi-idle #head,
		.pawi-idle #arms,
		.pawi-teach #arms,
		.pawi-teach #pointer,
		.pawi-teach #right-arm {
			animation: none !important;
		}
	}
</style>
