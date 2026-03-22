<script>
	import Icon from '@iconify/svelte';
	export let resource;
</script>

<div
	class="group relative z-10 flex h-full flex-col overflow-hidden rounded-[2rem] border border-white bg-white p-8 shadow-[0_10px_30px_rgba(12,49,67,0.04)] transition-all duration-500 hover:-translate-y-2 hover:border-blue-200 hover:shadow-[0_20px_40px_rgba(12,49,67,0.1)]"
>
	<!-- Subtle background glow on hover -->
	<div
		class="absolute -top-4 -right-4 z-[-1] opacity-0 transition-opacity duration-700 group-hover:opacity-100"
	>
		<div class="h-32 w-32 rounded-full bg-blue-50 blur-[30px]"></div>
	</div>

	<div class="mb-6 flex items-center gap-5">
		<div
			class="text-primary-light flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-50 shadow-inner transition-colors duration-500"
		>
			{#if resource.iconType === 'iconify'}
				<Icon icon={resource.icon} width="32" height="32" />
			{:else if resource.iconType === 'image'}
				<img
					src={resource.icon}
					alt={resource.title}
					class="h-8 w-8 transform object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-110"
				/>
			{/if}
		</div>
		<div>
			<h3
				class="group-hover:text-primary text-xl leading-tight font-bold text-slate-800 transition-colors"
			>
				{#if resource.url}
					<a
						href={resource.url}
						target="_blank"
						rel="noopener noreferrer"
						class="focus:outline-none">{resource.title}</a
					>
				{:else}
					<span>{resource.title}</span>
				{/if}
			</h3>
		</div>
	</div>

	<p class="relative z-20 mb-6 flex-grow text-sm leading-relaxed text-gray-600">
		{resource.description}
	</p>

	{#if resource.url}
		<div class="mt-auto">
			<a
				href={resource.url}
				target="_blank"
				rel="noopener noreferrer"
				class="text-primary hover:text-primary-light -m-2 inline-flex items-center rounded-md p-2 text-sm font-bold tracking-wide transition-all duration-300"
			>
				LEARN MORE
				<Icon
					icon="mdi:arrow-right"
					class="ml-2 h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-2"
				/>
			</a>
		</div>
	{/if}
</div>
