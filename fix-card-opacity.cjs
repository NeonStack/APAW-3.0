const fs = require('fs');

let content = fs.readFileSync('src/routes/resources/_ResourceCard.svelte', 'utf8');

// Global replaces
content = content.replace(/to-primary\/5/g, 'to-slate-50');
content = content.replace(/bg-primary-light\/10/g, 'bg-primary-light opacity-10');
content = content.replace(/bg-primary\/10 absolute right-1\/2/g, 'bg-primary opacity-10 absolute right-1/2'); 
content = content.replace(/border-primary\/20/g, 'border-blue-200');
content = content.replace(/bg-white\/80/g, 'bg-white bg-opacity-80');
content = content.replace(/border-primary\/10/g, 'border-blue-200');
content = content.replace(/text-white\/80/g, 'text-white text-opacity-80');
content = content.replace(/text-white\/90/g, 'text-white text-opacity-90');
content = content.replace(/text-primary\/60/g, 'text-blue-500');
content = content.replace(/from-primary\/5/g, 'from-blue-50');
content = content.replace(/bg-primary\/10/g, 'bg-blue-50'); // the remaining one
content = content.replace(/to-primary-light\/10/g, 'to-transparent');
content = content.replace(/border-primary-light\/50/g, 'border-blue-300');
content = content.replace(/bg-slate-800\/50/g, 'bg-slate-800 bg-opacity-50');
content = content.replace(/border-slate-700\/50/g, 'border-slate-700 border-opacity-50');
content = content.replace(/text-red-400\/80/g, 'text-red-400 text-opacity-80');
content = content.replace(/from-primary\/90/g, 'from-primary');
content = content.replace(/border-primary-light\/30/g, 'border-blue-300');
content = content.replace(/border-primary\/50/g, 'border-blue-300');
content = content.replace(/group-hover:text-primary\/\[0.03\]/g, 'group-hover:text-slate-100');
// Also if there's any text-primary/[0.03] we strip it.

// One more check: group-hover:bg-primary/[0.03] ? No, only text
fs.writeFileSync('src/routes/resources/_ResourceCard.svelte', content);
