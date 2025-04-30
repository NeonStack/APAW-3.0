<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  // Settings state
  let mapView = 'standard';
  let notifications = true;
  let updateFrequency = '60';
  
  // Update settings and notify parent
  function updateMapView(event) {
    mapView = event.target.value;
    dispatch('settingChange', { setting: 'mapView', value: mapView });
  }
  
  function updateNotifications(event) {
    notifications = event.target.checked;
    dispatch('settingChange', { setting: 'notifications', value: notifications });
  }
  
  function updateFrequencyChange(event) {
    updateFrequency = event.target.value;
    dispatch('settingChange', { setting: 'updateFrequency', value: updateFrequency });
  }
</script>

<div class="settings-tab">
  <h2 class="text-xl font-semibold text-[#0c3143] mb-3">Settings</h2>
  
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Map View</label>
      <select 
        class="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-[#0c3143] focus:border-[#3ba6d0]"
        value={mapView}
        on:change={updateMapView}
      >
        <option value="standard">Standard</option>
        <option value="topographic">Topographic</option>
        <option value="satellite">Satellite</option>
      </select>
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Alert Notifications</label>
      <label class="inline-flex items-center">
        <input 
          type="checkbox" 
          class="rounded text-[#0c3143] focus:ring-[#3ba6d0]" 
          checked={notifications}
          on:change={updateNotifications}
        >
        <span class="ml-2 text-sm text-gray-700">Enable notifications</span>
      </label>
    </div>
    
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Update Frequency</label>
      <select 
        class="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-[#0c3143] focus:border-[#3ba6d0]"
        value={updateFrequency}
        on:change={updateFrequencyChange}
      >
        <option value="30">Every 30 minutes</option>
        <option value="60">Every hour</option>
        <option value="180">Every 3 hours</option>
        <option value="360">Every 6 hours</option>
      </select>
    </div>
    
    <div class="pt-4 border-t border-gray-200">
      <button class="px-4 py-2 bg-[#3ba6d0] text-white rounded-md hover:bg-[#2d8fb3] transition-colors">
        Save Settings
      </button>
    </div>
  </div>
</div>
