export function getStationAlertInfo(station) {
  let status = 'normal';
  let color = '#ffffff';
  const currentWL = parseFloat(station.wl);
  const alertWL = parseFloat(station.alertwl);
  const alarmWL = parseFloat(station.alarmwl);
  const criticalWL = parseFloat(station.criticalwl);
  
  if (!isNaN(currentWL)) {
    if (!isNaN(criticalWL) && currentWL >= criticalWL) {
      status = 'critical';
      color = '#ff0000';
    } else if (!isNaN(alarmWL) && currentWL >= alarmWL) {
      status = 'alarm';
      color = '#ff8800';
    } else if (!isNaN(alertWL) && currentWL >= alertWL) {
      status = 'alert';
      color = '#ffcc00';
    }
  }
  return { status, color };
}

export function createWaterIcon(L, alertStatus = 'normal') {
  let color;
  switch (alertStatus) {
    case 'critical':
      color = '#ff0000';
      break;
    case 'alarm':
      color = '#ff8800';
      break;
    case 'alert':
      color = '#ffcc00';
      break;
    default:
      color = '#ffffff';
  }
  
  const iconContainer = document.createElement('div');
  iconContainer.className = 'water-station-icon';
  iconContainer.dataset.status = alertStatus;
  const svgIcon = `<svg width="30" height="30" viewBox="0 0 24 24"><defs><filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2" result="blur" /><feFlood flood-color="${color}" result="glow" /><feComposite in="glow" in2="blur" operator="in" result="glowBlur" /><feComposite in="SourceGraphic" in2="glowBlur" operator="over" /></filter></defs><circle cx="12" cy="14" r="9" fill="#0055aa" opacity="0.3" /><path d="M12 20a6 6 0 0 1-6-6c0-4 6-10.75 6-10.75S18 10 18 14a6 6 0 0 1-6 6Z" fill="#00b3ff" stroke="${color}" stroke-width="1.5" filter="url(#glow)" /></svg>`;
  iconContainer.innerHTML = svgIcon;
  
  return L.divIcon({
    html: iconContainer,
    className: `water-station-marker status-${alertStatus}`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
}

export function createWaterStationPopup(station) {
  let content = '';

  console.log(station)
  
  // Add station name at the top of popup
  if (station.obsnm) {
    content += `<h3 style="font-weight: bold; font-size: 1.1em; margin-bottom: 5px; color: #0c3143;">${station.obsnm} Station</h3>`;
  }
  
  // Station ID
  content += `<b>ID:</b> ${station.obscd || 'N/A'}<br>`;
  
  // Current water level
  content += `<b>Water Level:</b> ${station.wl || 'N/A'} m<br>`;
  
  // Water level change
  if (station.wlchange && station.wlchange !== '-') {
    const changeClass = parseFloat(station.wlchange) > 0 ? 'color: #ff4757;' : 'color: #2ed573;';
    content += `<b>Change:</b> <span style="${changeClass}">${station.wlchange} m</span><br>`;
  }
  
  // Last update time
  if (station.timestr) {
    content += `<b>Last Updated:</b> ${station.timestr}<br>`;
  }
  
  // Alert thresholds
  content += '<div style="margin-top: 8px;">';
  if (station.alertwl) {
    content += `<div><b>Alert:</b> <span class="alert-threshold">${station.alertwl} m</span></div>`;
  }
  if (station.alarmwl) {
    content += `<div><b>Alarm:</b> <span class="alarm-threshold">${station.alarmwl} m</span></div>`;
  }
  if (station.criticalwl) {
    content += `<div><b>Critical:</b> <span class="critical-threshold">${station.criticalwl} m</span></div>`;
  }
  content += '</div>';
  
  // Status indicator
  const { status, statusText } = getStationAlertInfo(station);
  if (status) {
    content += `<div style="margin-top: 5px;"><span class="status status-${getStationAlertInfo(station).status}">${getStationAlertInfo(station).status.charAt(0).toUpperCase() + getStationAlertInfo(station).status.slice(1)}</span></div>`;
  }
  
  return content;
}
