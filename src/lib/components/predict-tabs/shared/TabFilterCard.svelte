<script>
	import Icon from '@iconify/svelte';

	let {
		children,
		title = 'Filter & Sort',
		headingIcon = 'mdi:filter',
		headingIconWrapperClass = 'bg-primary',
		headingTextClass = 'text-primary'
	} = $props();
</script>

<div class="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
	<div class="mb-2 flex items-center space-x-2">
		<div class={`rounded p-1 ${headingIconWrapperClass}`}>
			<Icon icon={headingIcon} class="text-white" width="12" />
		</div>
		<h3 class={`text-sm font-semibold ${headingTextClass}`}>{title}</h3>
	</div>

	{@render children?.()}
</div>
