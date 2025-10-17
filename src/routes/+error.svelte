<script>
	import { page } from '$app/stores';
	import { error } from '@sveltejs/kit';
</script>

<svelte:head>
	<title>APAW | {$page.status} {$page.error.message}</title>
</svelte:head>

<main class="flex h-[80dvh] flex-col items-center justify-center">
	<div class="flex items-center justify-center gap-5 p-8">
		<div class="flex flex-auto flex-col items-center justify-center px-4 text-center lg:flex-row">
			<h1
				class="text-primary-light text-5xl font-extrabold tracking-tight lg:mr-6 lg:border-r-4 lg:border-gray-900/10 lg:pr-6"
			>
				{$page.status}
			</h1>
			<h2 class="text-primary/80 mt-2 text-3xl lg:mt-0">{$page.error.message}</h2>
		</div>
	</div>
</main>
