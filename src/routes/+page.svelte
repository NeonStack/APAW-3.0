<script>
  import PredictTabs from '$lib/components/PredictTabs.svelte';
  import { onMount } from 'svelte';
  import Icon from '@iconify/svelte';
  
  const features = [
    {
      title: '5-Day Flood Forecast',
      description: 'Machine learning-based predictions of flood risk up to five days ahead.',
      icon: 'material-symbols:online-prediction'
    },
    {
      title: 'Interactive Risk Map',
      description: 'Select any location within the NCR on the map to view its 5-day flood risk forecast.',
      icon: 'mdi:map-marker-radius'
    },
    {
      title: 'Early Action Support',
      description: 'Advance forecasts to aid timely decisions and preventive measures.',
      icon: 'material-symbols:emergency-home'
    },
    {
      title: 'Insightful Forecasting',
      description: 'Data-driven predictions using historical patterns and weather data.',
      icon: 'mdi:chart-areaspline'
    }
  ];
  
  // Generate raindrops with random properties
  const raindrops = Array(100).fill().map(() => ({
    left: Math.random() * 100,
    animationDuration: 0.5 + Math.random() * 1.5,
    delay: Math.random() * 5,
    opacity: 0.1 + Math.random() * 0.3,
    size: 1 + Math.random() * 4
  }));
</script>

<svelte:head>
  <title>APAW - Advanced Predictive Analysis of Water-related Flood Risk</title>
</svelte:head>

<!-- Premium Contest-Worthy Hero Section -->
<section class="relative overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
  <!-- Decorative Elements -->
  <div class="absolute top-0 left-0 z-0 h-full w-full overflow-hidden">
    <div
      class="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-blue-100 opacity-40 blur-3xl"
    ></div>
    <div
      class="absolute top-1/4 -right-32 h-96 w-96 rounded-full bg-primary-light opacity-10 blur-3xl"
    ></div>
  </div>
  
  <!-- Rain Effect -->
  <div class="raindrops-container">
    {#each raindrops as raindrop}
      <div 
        class="raindrop" 
        style="
          left: {raindrop.left}%; 
          animation-duration: {raindrop.animationDuration}s; 
          animation-delay: {raindrop.delay}s;
          opacity: {raindrop.opacity};
          width: {raindrop.size}px;
          height: {raindrop.size * 10}px;
        "
      ></div>
    {/each}
  </div>

  <div class="relative z-10 container mx-auto px-8 pt-12 md:px-16 md:pt-20 md:pb-20">
    <!-- Content with enhanced layout -->
    <div class="mx-auto max-w-5xl">
      <div class="mb-12 text-center">
        <!-- Improved heading design with better spacing and visual hierarchy -->
        <div class="relative inline-block">
          <h1
            class="mb-2 text-3xl leading-tight font-bold tracking-tight text-primary md:mb-3 md:text-5xl lg:text-6xl"
          >
            Advanced Predictive Analysis
          </h1>
          <h1
            class="text-3xl leading-tight font-bold tracking-tight text-primary-light md:text-5xl lg:text-6xl"
          >
            of Water-Related Flood Risk
          </h1>
          <!-- Subtle accent line -->
          <div
            class="absolute -bottom-6 left-1/2 hidden h-1 w-24 -translate-x-1/2 transform rounded-full bg-primary-light opacity-70 md:block"
          ></div>
        </div>

        <!-- Improved subheading with better spacing -->
        <p class="mx-auto mt-10 max-w-3xl text-lg leading-relaxed text-gray-700 md:text-xl">
          Applying supervised learning models to analyze integrated hydrometeorological data and predict potential flood occurrences at specific locations.
        </p>
      </div>

      <!-- CTA Buttons with improved spacing -->
      <div class="mt-8 flex flex-col justify-center items-center gap-5 sm:flex-row">
        <a
          href="/predict"
          class="w-48 transform rounded-lg bg-primary-light px-8 py-3 text-center font-medium text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-[#2d8fb3] hover:shadow-lg sm:w-auto sm:min-w-[180px]"
        >
          View Predictions
        </a>
        <a
          href="/about"
          class="w-48 transform rounded-lg border border-gray-300 bg-white px-8 py-3 text-center font-medium text-primary shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-gray-50 hover:shadow-lg sm:w-auto sm:min-w-[180px]"
        >
          Learn More
        </a>
      </div>
    </div>
  </div>

  <!-- Enhanced Wave Animation with perspective - UNCHANGED as requested -->
  <div class="waves-container">
    <svg
      class="waves"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      viewBox="0 24 150 28"
      preserveAspectRatio="none"
      shape-rendering="auto"
    >
      <defs>
        <path
          id="gentle-wave"
          d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
        />
      </defs>
      <g class="parallax">
        <use xlink:href="#gentle-wave" x="48" y="0" fill="rgba(129, 212, 250, 0.7)" />
        <use xlink:href="#gentle-wave" x="48" y="3" fill="rgba(79, 195, 247, 0.5)" />
        <use xlink:href="#gentle-wave" x="48" y="5" fill="rgba(59, 166, 208, 0.3)" />
        <use xlink:href="#gentle-wave" x="48" y="7" fill="#3ba6d0" />
      </g>
    </svg>
  </div>
</section>

<!-- Features Section -->
<section class="bg-primary-light py-20 text-white">
  <div class="container mx-auto px-8 md:px-16">
    <div class="mb-16 text-center">
      <span
        class="bg-opacity-30 mb-4 inline-block rounded-full bg-primary px-3 py-1 text-sm font-medium text-white"
        >OUR PLATFORM</span
      >
      <h2 class="mb-4 text-3xl font-bold text-white md:text-4xl">
        Proactive Flood Preparedness Tools
      </h2>
      <p class="text-opacity-90 mx-auto max-w-3xl text-xl text-white">
        Leveraging predictive models to generate location-specific flood risk forecasts, enabling communities and individuals to prepare more effectively for potential water-related events.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
      {#each features as feature}
        <div
          class="bg-opacity-40 border-opacity-30 rounded-xl border border-primary bg-primary p-8 shadow-lg transition duration-300 hover:translate-y-[-5px] hover:shadow-xl"
        >
          <div
            class="bg-opacity-50 mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-3xl text-white"
          >
            <Icon icon={feature.icon} />
          </div>
          <h3 class="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
          <p class="text-opacity-90 text-white">{feature.description}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- Call to Action Section -->
<section class="py-24">
  <div class="container mx-auto px-8 md:px-16">
    <div
      class="rounded-2xl bg-gradient-to-r from-primary to-[#154a67] p-12 text-center shadow-xl md:p-16"
    >
      <div class="mx-auto max-w-3xl">
        <h2 class="mb-6 text-3xl font-bold text-white">Ready to explore APAW's flood prediction?</h2>
        <p class="mb-10 text-lg text-blue-100">
          Access our advanced prediction now and see how APAW can help your community stay safe
          from water-related flood risk.
        </p>
        <a
          href="/predict"
          class="inline-block rounded-lg bg-primary-light px-8 py-3 font-medium text-white shadow-md transition-colors hover:bg-[#2d8fb3]"
        >
          Get Started
        </a>
      </div>
    </div>
  </div>
</section>

<style>
  .waves-container {
    position: relative;
    width: 100%;
    height: 150px;
    overflow: hidden;
  }

  .waves {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 100%;
    min-height: 100px;
    max-height: 150px;
  }

  .parallax > use {
    animation: move-forever 25s cubic-bezier(0.55, 0.5, 0.45, 0.5) infinite;
  }

  .parallax > use:nth-child(1) {
    animation-delay: -2s;
    animation-duration: 7s;
  }

  .parallax > use:nth-child(2) {
    animation-delay: -3s;
    animation-duration: 10s;
  }

  .parallax > use:nth-child(3) {
    animation-delay: -4s;
    animation-duration: 13s;
  }

  .parallax > use:nth-child(4) {
    animation-delay: -5s;
    animation-duration: 20s;
  }

  @keyframes move-forever {
    0% {
      transform: translate3d(-90px, 0, 0);
    }
    100% {
      transform: translate3d(85px, 0, 0);
    }
  }

  /* Responsive adjustments for mobile */
  @media (max-width: 768px) {
    .waves-container {
      height: 80px;
    }

    .waves {
      height: 40px;
      min-height: 40px;
    }
  }

  /* Rain Effect */
  .raindrops-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    z-index: 1;
    pointer-events: none;
  }

  .raindrop {
    position: absolute;
    top: -10vh;
    background: linear-gradient(to bottom, rgba(59, 166, 208, 0), rgba(59, 166, 208, 0.6));
    border-radius: 0 0 5px 5px;
    transform-origin: top center;
    animation: falling linear infinite;
  }

  @keyframes falling {
    0% {
      transform: translateY(-10px) scaleY(0);
    }
    20% {
      transform: translateY(0) scaleY(1);
    }
    100% {
      transform: translateY(calc(100vh + 20px));
    }
  }

  /* Responsive adjustments for the rain effect */
  @media (max-width: 768px) {
    .raindrops-container {
      display: none; /* Hide rain on small screens for better performance */
    }
  }
</style>