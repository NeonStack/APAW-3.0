<script>
	import Icon from '@iconify/svelte';
	import { resources, categories } from './_resources.js';
	import ResourceCard from './_ResourceCard.svelte';
</script>

<svelte:head>
	<title>APAW | Resources</title>
	<meta
		name="description"
		content="Discover the data sources, algorithms, libraries, and tools used to build the APAW flood prediction platform."
	/>
</svelte:head>

<section
	class="relative flex flex-col overflow-hidden bg-gradient-to-b from-white via-white to-slate-100 pt-20 pb-20"
>
	<!-- Abstract glowing background -->
	<div class="pointer-events-none absolute inset-0 z-0 overflow-hidden">
		<div
			class="bg-primary-light absolute top-[-10%] left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full opacity-10 blur-[80px] sm:top-0 sm:-left-20 sm:h-[600px] sm:w-[600px] sm:translate-x-0 sm:blur-[120px]"
		></div>
		<div
			class="bg-primary absolute right-1/2 bottom-[-10%] h-[300px] w-[300px] translate-x-1/2 rounded-full opacity-10 blur-[80px] sm:-right-20 sm:-bottom-32 sm:h-[500px] sm:w-[500px] sm:translate-x-0 sm:blur-[100px]"
		></div>
	</div>

	<div class="relative z-10 container mx-auto px-6">
		<div class="mx-auto max-w-5xl text-center">
			<div
				class="bg-opacity-80 mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-5 py-2.5 shadow-sm backdrop-blur-md"
			>
				<Icon icon="mdi:server-network" class="text-primary h-5 w-5" />
				<span class="text-primary text-sm font-bold tracking-wide uppercase"
					>The Vision Behind APAW</span
				>
			</div>

			<h1 class="text-primary mb-8 text-5xl font-black tracking-tight md:text-6xl lg:text-7xl">
				Project Resources
			</h1>

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
