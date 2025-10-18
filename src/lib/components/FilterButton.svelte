<script>
	let { children, className = '', onclick = null } = $props();
</script>

<button
	class="flex cursor-pointer items-center justify-center gap-1 rounded border-2 border-gray-300 bg-gray-100 px-2 py-1 text-sm leading-0 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 {className}"
	{onclick}
>
	{@render children?.()}
</button>
