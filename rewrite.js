const fs = require('fs');
const file = 'src/routes/about/+page.svelte';
let content = fs.readFileSync(file, 'utf8');

const scriptEnd = content.indexOf('</script>') + '</script>'.length;
const scriptPart = content.slice(0, scriptEnd);

const newHtml = `

<svelte:head>
<title>APAW | The Technology</title>
<meta
name="description"
content="Learn about APAW's mission, technical achievements, methodology, and our commitment to improving flood preparedness through machine learning."
/>
</svelte:head>

<!-- Ultra-Premium Hero Section -->
<section class="relative min-h-[70svh] flex flex-col justify-center items-center overflow-hidden bg-gradient-to-b from-primary via-[#0c2f40] to-slate-50">
<!-- Glowing Background Orbs -->
<div class="absolute inset-0 pointer-events-none overflow-hidden">
<div class="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-primary-light/20 rounded-full blur-[120px] mix-blend-screen mix-blend-plus-lighter"></div>
<div class="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px] mix-blend-plus-lighter"></div>

<!-- Scanline Grid Matrix -->
<div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
</div>

<div class="relative z-10 container mx-auto px-6 text-center max-w-5xl pt-20 pb-16">
<div class="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary-light/30 bg-primary-light/10 backdrop-blur-md mb-8 shadow-[0_0_20px_rgba(59,166,208,0.2)]">
<Icon icon="mdi:rocket-launch" class="text-primary-light text-lg" />
<span class="text-primary-light text-xs font-bold tracking-[0.2em] uppercase">The APAW Project</span>
</div>

<h1 class="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-8 tracking-tight drop-shadow-lg leading-[1.1]">
Decoding the Future of <br/>
<span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-light via-blue-200 to-cyan-100">
Flood Prediction
</span>
</h1>

<p class="mx-auto max-w-3xl text-xl md:text-2xl text-slate-300 font-light leading-relaxed">
We apply supervised learning models to analyze integrated hydrometeorological data, empowering communities with unprecedented forecast accuracy.
</p>
</div>
</section>

<!-- Project Overview Section -->
<section class="py-24 bg-slate-50 relative overflow-hidden">
<div class="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>

<div class="container mx-auto px-6 max-w-7xl relative z-10">
<div class="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

<!-- Left text -->
<div class="lg:col-span-7">
<div class="inline-block mb-3 px-3 py-1 rounded-md bg-primary-light/10 text-primary uppercase text-xs font-bold tracking-widest">
Overview
</div>
<h2 class="text-4xl md:text-5xl font-black text-slate-900 mb-8 tracking-tight">
What exactly is <span class="text-primary">APAW?</span>
</h2>

<div class="prose prose-lg text-slate-600 leading-relaxed mb-8">
<p class="mb-6">
<strong>APAW (Advanced Predictive Analysis of Water-related Flood Risk)</strong> is an innovative flood prediction platform developed as a technological breakthrough in localized disaster preparedness. 
</p>
<p>
Using advanced machine learning techniques, APAW continuously analyzes complex weather patterns, geographical features, and historical precipitation data. Our system addresses a critical gap by providing micro-location specific predictions for any specific area within Metro Manila—moving far beyond traditional regional warnings to enable true proactive community safety.
</p>
</div>
</div>

<!-- Right floating stats grid -->
<div class="lg:col-span-5 grid gap-5">
<!-- Stat 1 -->
<div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_20px_40px_-15px_rgba(12,49,67,0.08)] transform transition-transform hover:-translate-y-1 relative overflow-hidden group">
<div class="absolute top-0 right-0 w-24 h-24 bg-primary-light/5 rounded-bl-full -z-0 group-hover:bg-primary-light/10 transition-colors"></div>
<div class="relative z-10 flex items-center gap-5">
<div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-[#164b63] flex justify-center items-center text-4xl font-black text-white shadow-lg shadow-primary/20">
5
</div>
<div>
<div class="text-sm font-bold tracking-wider text-slate-400 uppercase">Days</div>
<div class="text-xl font-bold text-slate-800">Advance Forecast</div>
</div>
</div>
</div>

<!-- Stat 2 -->
<div class="ml-0 lg:ml-8 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_20px_40px_-15px_rgba(12,49,67,0.08)] transform transition-transform hover:-translate-y-1 relative overflow-hidden group">
<div class="absolute top-0 right-0 w-24 h-24 bg-primary-light/5 rounded-bl-full -z-0 group-hover:bg-primary-light/10 transition-colors"></div>
<div class="relative z-10 flex items-center gap-5">
<div class="w-16 h-16 rounded-full bg-primary-light/20 flex justify-center items-center text-primary-light">
<Icon icon="mdi:update" class="text-3xl" />
</div>
<div>
<div class="text-sm font-bold tracking-wider text-slate-400 uppercase">Updates</div>
<div class="text-xl font-bold text-slate-800">Hourly Predictions</div>
</div>
</div>
</div>

<!-- Stat 3 -->
<div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_20px_40px_-15px_rgba(12,49,67,0.08)] transform transition-transform hover:-translate-y-1 relative overflow-hidden group">
<div class="absolute top-0 right-0 w-24 h-24 bg-primary-light/5 rounded-bl-full -z-0 group-hover:bg-primary-light/10 transition-colors"></div>
<div class="relative z-10 flex items-center gap-5">
<div class="w-16 h-16 rounded-full bg-primary/10 flex justify-center items-center text-primary">
<Icon icon="mdi:brain" class="text-3xl" />
</div>
<div>
<div class="text-sm font-bold tracking-wider text-slate-400 uppercase">Architecture</div>
<div class="text-xl font-bold text-slate-800">RF + LSTM Models</div>
</div>
</div>
</div>
</div>
</div>
</div>
</section>

<!-- Achievements Section -->
<section class="py-24 bg-white">
<div class="container mx-auto px-6 max-w-7xl">
<div class="mb-16 text-center">
<h2 class="text-primary mb-4 text-4xl font-black md:text-5xl tracking-tight">Technical Achievements</h2>
<div class="bg-primary-light mx-auto mb-6 h-1.5 w-24 rounded-full"></div>
<p class="mx-auto max-w-2xl text-lg text-slate-500 font-light">
Rigorous validation proves our models deliver highly dependable forecasting metrics.
</p>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
{#each achievements as achievement}
<div class="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 md:p-10 shadow-[0_15px_40px_-15px_rgba(12,49,67,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_-15px_rgba(12,49,67,0.1)]">
<!-- Top gradient accent line -->
<div class="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary to-primary-light transform origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"></div>

<div class="flex items-start gap-6">
<div class="shrink-0 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-primary-light group-hover:bg-primary-light group-hover:text-white transition-colors duration-300 shadow-sm border border-slate-100">
<Icon icon={achievement.icon} class="text-3xl" />
</div>
<div>
<div class="mb-2 inline-block rounded-md bg-primary/5 px-2 py-1 text-sm font-bold text-primary">
{achievement.metric}
</div>
<h3 class="mb-3 text-xl font-bold text-slate-800">{achievement.title}</h3>
<p class="text-slate-600 leading-relaxed font-light">{achievement.description}</p>
</div>
</div>
</div>
{/each}
</div>
</div>
</section>

<!-- Methodology Timeline -->
<section class="py-24 bg-[#0a1922] relative overflow-hidden">
<!-- Background grid for dark theme -->
<div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

<div class="container mx-auto px-6 max-w-5xl relative z-10">
<div class="mb-20 text-center">
<h2 class="text-white mb-4 text-4xl font-black md:text-5xl tracking-tight">Our Methodology</h2>
<div class="bg-primary-light mx-auto mb-6 h-1 w-24 rounded-full shadow-[0_0_15px_#3ba6d0]"></div>
<p class="mx-auto max-w-2xl text-lg text-slate-400 font-light">
A sophisticated four-step pipeline combining traditional Machine Learning and Deep Learning.
</p>
</div>

<div class="space-y-6 relative">
<!-- Vertical Line connecting steps -->
<div class="absolute left-[38px] lg:left-[43px] top-6 bottom-6 w-1 bg-gradient-to-b from-primary/30 via-primary-light/50 to-primary/30 z-0"></div>

{#each methodology as step, i}
<div class="relative z-10 flex items-start gap-6 lg:gap-10 group">
<div class="shrink-0 w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-[#0a1922] border-4 border-slate-800 group-hover:border-primary-light transition-colors duration-500 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(0,0,0,0.5)] relative overflow-hidden">
<div class="absolute inset-0 bg-primary-light/10 group-hover:bg-primary-light/30 transition-colors"></div>
<span class="text-3xl font-black text-slate-400 group-hover:text-white transition-colors">#{step.step}</span>
</div>

<div class="pt-3 pb-8 flex-1">
<div class="bg-[#122836] border border-white/5 rounded-3xl p-8 shadow-2xl transition-transform duration-500 group-hover:-translate-y-1">
<div class="flex items-center gap-4 mb-4">
<div class="p-3 bg-white/5 rounded-xl text-primary-light">
<Icon icon={step.icon} class="text-2xl" />
</div>
<h3 class="text-2xl font-bold text-white tracking-tight">{step.title}</h3>
</div>
<p class="text-slate-400 leading-relaxed font-light text-lg">
{step.description}
</p>
</div>
</div>
</div>
{/each}
</div>
</div>
</section>

<!-- Comparison vs Traditional -->
<section class="py-32 bg-slate-100">
<div class="container mx-auto px-6 max-w-7xl">
<div class="mb-16 text-center">
<h2 class="text-primary mb-4 text-4xl font-black md:text-5xl tracking-tight">The APAW Advantage</h2>
<div class="bg-primary-light mx-auto mb-6 h-1.5 w-24 rounded-full"></div>
<p class="mx-auto max-w-2xl text-lg text-slate-500 font-light">
How advanced AI prediction transcends traditional warning infrastructure.
</p>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

<!-- Traditional Column -->
<div class="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-lg">
<div class="text-center mb-10">
<div class="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
<Icon icon="mdi:radio-tower" class="text-3xl" />
</div>
<h3 class="text-3xl font-black text-slate-400">Traditional Systems</h3>
</div>

<div class="space-y-6">
{#each features as feature}
<div class="p-6 rounded-2xl bg-slate-50 border border-slate-100">
<div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{feature.feature}</div>
<div class="flex items-start gap-3">
<Icon icon="mdi:close-circle" class="text-red-400 text-xl shrink-0 mt-0.5" />
<p class="text-slate-600 font-medium">{feature.traditional}</p>
</div>
</div>
{/each}
</div>
</div>

<!-- APAW Column -->
<div class="bg-gradient-to-br from-primary to-[#0f3d54] rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(12,49,67,0.3)] relative overflow-hidden transform lg:scale-105 border border-primary-light/30">
<!-- Shine effect -->
<div class="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none"></div>
<div class="absolute -top-32 -right-32 w-64 h-64 bg-primary-light/20 blur-[60px] rounded-full"></div>

<div class="text-center mb-10 relative z-10">
<div class="w-16 h-16 mx-auto bg-primary-light/20 border border-primary-light/30 rounded-full flex items-center justify-center mb-4 text-primary-light shadow-[0_0_20px_rgba(59,166,208,0.2)]">
<Icon icon="mdi:rocket-launch" class="text-3xl" />
</div>
<h3 class="text-3xl font-black text-white drop-shadow-md">APAW Platform</h3>
</div>

<div class="space-y-6 relative z-10">
{#each features as feature}
<div class="p-6 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
<div class="text-xs font-bold text-primary-light uppercase tracking-wider mb-2">{feature.feature}</div>
<div class="flex items-start gap-3">
<Icon icon="mdi:check-decagram" class="text-primary-light text-xl shrink-0 mt-0.5 shadow-sm" />
<p class="text-white font-semibold">{feature.apaw}</p>
</div>
</div>
{/each}
</div>
</div>

</div>
</div>
</section>

<!-- Values Section (A-P-A-W) -->
<section class="py-24 bg-white relative overflow-hidden">
<div class="container mx-auto px-6 max-w-7xl relative z-10">
<div class="mb-20 text-center">
<h2 class="text-primary mb-4 text-4xl font-black md:text-5xl tracking-tight">What APAW Stands For</h2>
<div class="bg-primary-light mx-auto mb-6 h-1.5 w-24 rounded-full"></div>
<p class="mx-auto max-w-2xl text-lg text-slate-500 font-light">
The core values embedded in our identity shape every algorithm we refine and prediction we serve.
</p>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
{#each values as value, i}
<div class="group relative overflow-hidden rounded-[2rem] bg-slate-50 p-8 pt-12 border border-slate-100 hover:border-primary-light/30 transition-all duration-300 hover:shadow-[0_20px_40px_-5px_rgba(59,166,208,0.15)] flex flex-col justify-between">

<!-- Giant Background Letter -->
<div class="absolute -right-6 top-8 text-[180px] font-black leading-none text-slate-200/50 group-hover:text-primary-light/10 transition-colors duration-500 select-none z-0">
{['A','P','A','W'][i]}
</div>

<div class="relative z-10">
<div class="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary mb-6 border border-slate-100">
<Icon icon={value.icon} class="text-3xl" />
</div>
<h3 class="text-2xl font-extrabold text-slate-800 mb-4">{value.title}</h3>
<p class="text-slate-600 leading-relaxed font-light">{value.description}</p>
</div>
</div>
{/each}
</div>
</div>
</section>

<!-- Mission & Vision Footer Accent -->
<section class="py-10 bg-primary">
<div class="container mx-auto px-6 max-w-7xl">
<div class="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20">
<!-- Mission -->
<div class="flex gap-6 items-start">
<div class="shrink-0 p-4 bg-primary-light/20 rounded-2xl text-primary-light">
<Icon icon="mdi:target-variant" class="text-4xl" />
</div>
<div>
<h3 class="text-2xl font-bold text-white mb-3 tracking-tight">Our Mission</h3>
<p class="text-blue-100/70 leading-relaxed font-light">Our mission is to enhance community resilience and safety by developing and providing accessible, data-driven predictions for water-related flood risks, empowering proactive response.</p>
</div>
</div>
<!-- Vision -->
<div class="flex gap-6 items-start">
<div class="shrink-0 p-4 bg-primary-light/20 rounded-2xl text-primary-light">
<Icon icon="mdi:eye-outline" class="text-4xl" />
</div>
<div>
<h3 class="text-2xl font-bold text-white mb-3 tracking-tight">Our Vision</h3>
<p class="text-blue-100/70 leading-relaxed font-light">A future where communities are proactively safeguarded against flood impacts, utilizing accurate predictive insights to minimize risk to lives, property, and livelihoods.</p>
</div>
</div>
</div>
</div>
</section>
`;

fs.writeFileSync(file, scriptPart + newHtml);

console.log("Successfully rebuilt the About Us page.");
