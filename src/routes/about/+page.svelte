<script>
    import Icon from '@iconify/svelte';
    
    // Team members data
    const team = [
        {
            name: 'Team Member 1',
            role: 'Machine Learning Engineer',
            bio: 'Specializes in designing and implementing advanced prediction algorithms and data processing pipelines.',
            image: '/team/member1.jpg',
            social: [
                { icon: 'mdi:github', url: '#' },
                { icon: 'mdi:linkedin', url: '#' }
            ]
        },
        {
            name: 'Team Member 2',
            role: 'Full Stack Developer',
            bio: 'Develops and maintains the web application interfaces and backend services that power our prediction platform.',
            image: '/team/member2.jpg',
            social: [
                { icon: 'mdi:github', url: '#' },
                { icon: 'mdi:linkedin', url: '#' }
            ]
        },
        {
            name: 'Team Member 3',
            role: 'Data Scientist',
            bio: 'Analyzes complex hydrological and meteorological datasets to train and validate our prediction models.',
            image: '/team/member3.jpg',
            social: [
                { icon: 'mdi:github', url: '#' },
                { icon: 'mdi:linkedin', url: '#' }
            ]
        },
        {
            name: 'Team Member 4',
            role: 'GIS Specialist',
            bio: 'Works with geographical data to create accurate mapping systems and location-based features.',
            image: '/team/member4.jpg',
            social: [
                { icon: 'mdi:github', url: '#' },
                { icon: 'mdi:linkedin', url: '#' }
            ]
        }
    ];
    
    // Timeline/Journey data
    const journey = [
        {
            year: '2021',
            title: 'Project Inception',
            description: 'The concept for APAW was born from the need to address recurring flood disasters using predictive technology.'
        },
        {
            year: '2022',
            title: 'Research & Development',
            description: 'Intensive data collection, algorithm development, and model training began with our research team.'
        },
        {
            year: '2023',
            title: 'Beta Launch',
            description: 'Our first prediction models were deployed and tested in selected communities across Metro Manila.'
        },
        {
            year: '2024',
            title: 'Full Platform Release',
            description: 'APAW is now available to the public, continuously improving through feedback and additional data.'
        }
    ];
    
    // Values data
    const values = [
        {
            title: 'Accuracy',
            description: 'We are committed to thorough analysis and continuous improvement to provide the most reliable flood risk predictions possible based on available data.',
            icon: 'clarity:bullseye-line'
        },
        {
            title: 'Preparedness',
            description: 'We aim to empower individuals, communities, and authorities with timely information that facilitates effective planning and preparation for potential flood events.',
            icon: 'mdi:shield-check'
        },
        {
            title: 'Accessibility',
            description: 'We strive to make complex flood risk information understandable and readily available through user-friendly interfaces and clear communication.',
            icon: 'mdi:account-group'
        },
        {
            title: 'Well-being',
            description: 'We prioritize providing predictive insights that contribute to the safety and well-being of communities by enabling timely and informed actions against flood risks.',
            icon: 'mdi:heart'
        }
    ];
</script>

<svelte:head>
    <title>APAW | About Us</title>
    <meta 
      name="description" 
      content="Learn about APAW's mission, vision, core values." 
    />
</svelte:head>

<!-- Header section (styled like Resources page) -->
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
        <h1 class="mb-4 text-center text-4xl font-bold md:text-5xl">About APAW</h1>
        <div class="bg-primary-light mx-auto mb-6 h-1 w-24"></div>
        <p class="mx-auto max-w-2xl text-center text-lg">
            Our mission, vision, and the team behind APAW's flood prediction technology.
        </p>
    </div>
</div>

<!-- Mission and Vision Section -->
<section class="py-16 bg-white">
    <div class="container mx-auto px-8 md:px-16">
        <div class="mb-8 flex items-center">
            <h2 class="text-primary text-2xl font-bold md:text-3xl">Our Mission & Vision</h2>
            <div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Mission -->
            <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl">
                <div class="bg-primary-light h-2 w-full"></div>
                <div class="p-6">
                    <div class="mb-5 flex items-center">
                        <div>
                            <h3 class="mb-1 text-xl font-semibold text-primary">Our Mission</h3>
                        </div>
                    </div>
                    <p class="leading-relaxed text-gray-600 mb-4">
                        Our mission is to enhance community resilience and safety by developing and providing accessible, data-driven predictions for water-related flood risks, empowering proactive preparedness and response.
                    </p>
                </div>
            </div>
            
            <!-- Vision -->
            <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl">
                <div class="bg-primary-light h-2 w-full"></div>
                <div class="p-6">
                    <div class="mb-5 flex items-center">
                        <div>
                            <h3 class="mb-1 text-xl font-semibold text-primary">Our Vision</h3>
                        </div>
                    </div>
                    <p class="leading-relaxed text-gray-600 mb-4">
                        Our vision is a future where communities are proactively safeguarded against flood impacts, utilizing accurate and timely predictive insights to minimize risk to lives, property, and livelihoods.
                    </p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Core Values Section -->
<section class="py-28">
    <div class="container mx-auto px-8 md:px-16">
        <div class="mb-8 flex items-center">
            <h2 class="text-primary text-2xl font-bold md:text-3xl">Our Core Values</h2>
            <div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {#each values as value}
                <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl">
                    <div class="bg-primary-light h-2 w-full"></div>
                    <div class="p-6">
                        <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 shadow-sm">
                            <Icon icon={value.icon} class="text-primary-light" width="32" height="32" />
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-3">{value.title}</h3>
                        <p class="leading-relaxed text-gray-600">{value.description}</p>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>

<!-- Team Section -->
<!-- <section class="py-16 bg-white">
    <div class="container mx-auto px-8 md:px-16">
        <div class="mb-8 flex items-center">
            <h2 class="text-primary text-2xl font-bold md:text-3xl">Meet Our Team</h2>
            <div class="from-primary-light ml-4 h-px flex-grow bg-gradient-to-r to-transparent"></div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {#each team as member}
                <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl">
                    <div class="bg-primary-light h-2 w-full"></div>
                    <div class="relative h-64 overflow-hidden">
                        <img 
                            src={member.image} 
                            alt={member.name}
                            class="h-full w-full object-cover object-center"
                        />
                    </div>
                    <div class="p-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-1">{member.name}</h3>
                        <p class="text-primary-light font-medium mb-3">{member.role}</p>
                        <p class="text-gray-600 mb-4">{member.bio}</p>
                        
                        <div class="flex space-x-3">
                            {#each member.social as social}
                                <a 
                                    href={social.url} 
                                    class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 transition-colors hover:bg-primary-light hover:text-white"
                                >
                                    <Icon icon={social.icon} width="16" height="16" />
                                </a>
                            {/each}
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section> -->


