<script>
	import Icon from '@iconify/svelte';
	import { resources, categories } from './_resources.js';
	import ResourceCard from './_ResourceCard.svelte';

	// Resources data structure
</script>

<svelte:head>
	<title>APAW | Resources</title>
	<meta
		name="description"
		content="Discover the data sources, algorithms, libraries, and tools used to build the APAW flood prediction platform."
	/>
</svelte:head>
<div class="min-h-screen bg-gradient-to-b from-gray-50 to-white">
	<!-- Header section -->
	<div class="bg-primary relative mb-12 overflow-hidden px-4 py-12 text-white">
		<div class="absolute top-0 left-0 h-full w-full opacity-10">
			<div
				class="bg-primary-light absolute top-0 left-0 h-full w-1/2 translate-x-[-50%] translate-y-[-50%] rotate-45 transform"
			></div>
			<div
				class="bg-primary-light absolute right-0 bottom-0 h-full w-1/2 translate-x-[50%] translate-y-[50%] -rotate-45 transform"
			></div>
		</div>
		<div class="relative z-10 container mx-auto">
			<h1 class="mb-4 text-center text-4xl font-bold md:text-5xl">Project Resources</h1>
			<div class="bg-primary-light mx-auto mb-6 h-1 w-24"></div>
			<p class="mx-auto max-w-2xl text-center text-lg">
				These are the libraries, data sources, and tools that power our APAW project.
			</p>
		</div>
	</div>

	<div class="container mx-auto px-2 pb-16 lg:px-10">
		{#each categories as category}
			<div class="mb-16">
				<div class="mb-8 flex items-center">
					<h2 class="text-primary text-2xl font-bold md:text-3xl">{category}</h2>
					<div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
				</div>

				<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{#each resources.filter((r) => r.category === category) as resource}
						<ResourceCard {resource} />
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	@keyframes float {
		0% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-10px);
		}
		100% {
			transform: translateY(0px);
		}
	}
</style>
