<script>
	let {
		children,
		href = '#',
		className = '',
		width = 'w-full',
		nowrap = false,
		ariaLabel = undefined
	} = $props();
</script>

<a
	{href}
	class="{width} {className} overflow-hidden rounded-xl border-2 px-8 py-4 text-center font-semibold transition-all duration-300 hover:scale-101 hover:shadow-xl lg:w-auto lg:hover:scale-105"
	aria-label={ariaLabel}
>
	{#if nowrap}
		<span class="flex items-center justify-center gap-2">
			{@render children?.()}
		</span>
	{:else}
		{@render children?.()}
	{/if}
</a>
