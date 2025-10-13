<script>
	import Icon from '@iconify/svelte';
	export let resource;
</script>

<div
	class="group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:scale-101 hover:shadow-xl"
>
	<div class="bg-primary-light h-2 w-full"></div>
	<div class="flex h-full flex-col p-6">
		<div class="mb-5 flex items-center">
			<div
				class="mr-4 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-md transition-transform duration-300 group-hover:scale-110"
			>
				{#if resource.iconType === 'iconify'}
					<Icon icon={resource.icon} width="32" height="32" />
				{:else if resource.iconType === 'image'}
					<img src={resource.icon} alt={resource.title} class="h-8 w-8 object-contain" />
				{/if}
			</div>
			<div>
				<h3 class="mb-1 text-xl leading-tight font-semibold">
					{#if resource.url}
						<a
							href={resource.url}
							target="_blank"
							rel="noopener noreferrer"
							class="text-primary hover:text-primary-light transition-colors duration-300"
							>{resource.title}</a
						>
					{:else}
						<span class="text-primary">{resource.title}</span>
					{/if}
				</h3>
			</div>
		</div>

		<p class="flex-grow leading-relaxed text-gray-600">{resource.description}</p>

		{#if resource.url}
			<div class="mt-4 text-right">
				<a
					href={resource.url}
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary-light hover:text-primary inline-flex items-center p-5 text-sm font-medium transition-all duration-500 group-hover:translate-x-1"
				>
					Learn more
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="ml-1 h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M14 5l7 7m0 0l-7 7m7-7H3"
						/>
					</svg>
				</a>
			</div>
		{/if}
	</div>
</div>
