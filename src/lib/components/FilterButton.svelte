<script>
	let { children, className = '', onclick = null, disabled = false } = $props();
</script>

<button
	class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md active:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-700 disabled:hover:shadow-sm {className}"
	{onclick}
	{disabled}
	type="button"
>
	{@render children?.()}
</button>
