<script>
	import Icon from '@iconify/svelte';
	import FilterButton from '$lib/components/FilterButton.svelte';

	let {
		onclick = null,
		disabled = false,
		className = 'grow max-w-48',
		icon,
		iconWidth = 15,
		label
	} = $props();
</script>

<FilterButton {onclick} {disabled} {className}>
	<Icon {icon} width={iconWidth} />
	<span class="hidden sm:inline">{label}</span>
</FilterButton>
