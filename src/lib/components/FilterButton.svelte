<script>
    let { children, className = '', onclick = null } = $props();
</script>

<button
    class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow-md hover:text-gray-900 active:shadow-sm {className}"
    {onclick}
>
    {@render children?.()}
</button>