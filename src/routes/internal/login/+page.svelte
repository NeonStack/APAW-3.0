<script>
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let loading = false;
	let errorMessage = '';

	async function handleLogin(event) {
		event.preventDefault();
		errorMessage = '';
		loading = true;

		try {
			const res = await fetch('/api/internal/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			const payload = await res.json();
			if (!res.ok) {
				errorMessage = payload.error || 'Login failed.';
				return;
			}

			await goto('/internal/coordinates');
		} catch (error) {
			errorMessage = error?.message || 'Unable to login right now.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Internal Login | APAW</title>
</svelte:head>

<div class="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4">
	<form
		on:submit={handleLogin}
		class="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
	>
		<h1 class="mb-2 text-xl font-bold text-gray-900">Internal Access</h1>
		<p class="mb-5 text-sm text-gray-600">Sign in with your Supabase Auth account.</p>

		<label class="mb-3 block text-sm font-medium text-gray-700" for="email">Email</label>
		<input
			id="email"
			type="email"
			bind:value={email}
			required
			class="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm ring-blue-500 outline-none focus:ring"
		/>

		<label class="mb-3 block text-sm font-medium text-gray-700" for="password">Password</label>
		<input
			id="password"
			type="password"
			bind:value={password}
			required
			class="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm ring-blue-500 outline-none focus:ring"
		/>

		{#if errorMessage}
			<p class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
				{errorMessage}
			</p>
		{/if}

		<button
			type="submit"
			disabled={loading}
			class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
		>
			{loading ? 'Signing in...' : 'Sign in'}
		</button>
	</form>
</div>
