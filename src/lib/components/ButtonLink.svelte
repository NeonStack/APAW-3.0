<script>
	export let href = '#';
	export let className = '';
	export let width = 'w-full';
	export let nowrap = false;
</script>

<a
	{href}
	class="{width} {className} overflow-hidden rounded-xl border-2 px-8 py-4 text-center font-semibold transition-all duration-300 hover:scale-101 hover:shadow-xl lg:w-auto lg:hover:scale-105"
>
	{#if nowrap}
		<span class="flex items-center justify-center gap-2">
			<slot />
		</span>
	{:else}
		<slot />
	{/if}
</a>
