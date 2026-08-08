<script>
	import Icon from '@iconify/svelte';
	import { resources, categories } from './_resources.js';
	import ResourceCard from './_ResourceCard.svelte';
</script>

<svelte:head>
	<title>APAW | Resources</title>
	<meta
		name="description"
		content="Discover the data sources, algorithms, libraries, and tools behind the APAW flood risk prediction platform."
	/>
</svelte:head>

<section
	class="from-primary-light/25 relative flex flex-col overflow-hidden bg-gradient-to-b via-white to-slate-100 pt-20 pb-20"
>
	<div class="relative z-10 container mx-auto px-6">
		<div class="mx-auto max-w-5xl text-center">
			<h1 class="text-primary mb-8 text-5xl font-black md:text-6xl lg:text-7xl">Resources</h1>

			<p
				class="mx-auto max-w-3xl text-lg leading-relaxed font-light text-gray-600 md:text-xl lg:text-2xl"
			>
				Discover the data sources, algorithms, libraries, and tools that power the APAW machine
				learning platform.
			</p>
		</div>
	</div>
</section>

<!-- Resources Categories Section -->
<section class="relative z-20 bg-slate-50 py-16 pb-32">
	<div class="relative z-10 container mx-auto max-w-7xl px-6">
		{#each categories as category}
			<div class="mb-24 last:mb-0">
				<div class="mb-10 flex items-center md:mb-12">
					<!-- Category accent line -->
					<div
						class="to-primary mr-6 hidden h-px w-10 bg-gradient-to-r from-blue-200 md:block"
					></div>
					<h2
						class="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl"
					>
						{category}
					</h2>
					<div
						class="ml-6 h-px flex-grow bg-gradient-to-r from-blue-200 to-transparent opacity-50"
					></div>
				</div>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
					{#each resources.filter((r) => r.category === category) as resource}
						<ResourceCard {resource} />
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>
