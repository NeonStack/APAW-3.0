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
  return `
    <b>${station.name || 'Water Station'}</b><br>
    Water Level: ${station.wl || 'N/A'} m<br>
    <hr style="margin: 3px 0;">
    ${!isNaN(parseFloat(station.alertwl)) ? `Alert: <span class="alert-threshold">${station.alertwl} m</span><br>` : ''}
    ${!isNaN(parseFloat(station.alarmwl)) ? `Alarm: <span class="alarm-threshold">${station.alarmwl} m</span><br>` : ''}
    ${!isNaN(parseFloat(station.criticalwl)) ? `Critical: <span class="critical-threshold">${station.criticalwl} m</span><br>` : ''}
    Status: <span class="status status-${getStationAlertInfo(station).status}">${getStationAlertInfo(station).status.charAt(0).toUpperCase() + getStationAlertInfo(station).status.slice(1)}</span>
  `;
}
