const map = L.map('map').setView([35.681236, 139.767125], 13); // 東京駅
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let waypoints = [];
let routeLine = null;
let markers = [];

map.on('click', function(e) {
    if (waypoints.length < 2) {
        const point = [e.latlng.lng, e.latlng.lat];
        const index = waypoints.length;
        waypoints.push(point);
        const type = index === 0 ? 'start' : 'end';
        markers[index] = addMarker(e.latlng, type);
        updateInputFields();
    }
});

function addMarker(latlng, type) {
    const color = type === 'start' ? 'green' : 'red';
    const marker = L.circleMarker(latlng, {
        radius: 8,
        color: 'white',
        fillColor: color,
        fillOpacity: 1,
        weight: 2
    }).addTo(map).bindPopup(type === 'start' ? '出発点' : '到着点');
    return marker;
}

function updateInputFields() {
    if (waypoints[0]) {
        document.getElementById("startCoord").value = `${waypoints[0][1]},${waypoints[0][0]}`;
    }
    if (waypoints[1]) {
        document.getElementById("endCoord").value = `${waypoints[1][1]},${waypoints[1][0]}`;
    }
}

function updateMarkerFromInput(type) {
    const input = document.getElementById(type === 'start' ? 'startCoord' : 'endCoord').value.trim();
    const parts = input.split(',').map(s => s.trim());
    if (parts.length !== 2) return;

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return;

    const index = type === 'start' ? 0 : 1;

    while (waypoints.length <= index) {
        waypoints.push(null);
    }

    waypoints[index] = [lng, lat];

    if (markers[index]) {
        map.removeLayer(markers[index]);
    }

    markers[index] = addMarker([lat, lng], type);
}

function resetMap() {
    waypoints = [];
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }
    document.getElementById('distanceDisplay').innerText = '';
    document.getElementById('startCoord').value = '';
    document.getElementById('endCoord').value = '';
}

async function downloadGPX() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const mode = document.getElementById('mode').value;

    if (!apiKey) {
        alert("APIキーを入力してください。");
        return;
    }
    if (waypoints.length !== 2) {
        alert("出発点と到着点を設定してください。");
        return;
    }

    const url = `https://api.openrouteservice.org/v2/directions/${mode}/geojson`;

    try {
        const res = await axios.post(url, {
            coordinates: waypoints,
            preference: "shortest",
        }, {
            headers: {
                "Authorization": apiKey,
                "Content-Type": "application/json"
            }
        });

        const coords = res.data.features[0].geometry.coordinates;
        const distanceKm = (res.data.features[0].properties.summary.distance / 1000).toFixed(2);
        document.getElementById('distanceDisplay').innerText = `🛣️ 距離: ${distanceKm} km`;

        if (routeLine) map.removeLayer(routeLine);
        routeLine = L.polyline(coords.map(p => [p[1], p[0]]), { color: 'blue', weight: 5 }).addTo(map);

        const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MyApp" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Route</name><trkseg>
    ${coords.map(p => `<trkpt lat="${p[1]}" lon="${p[0]}" />`).join('\n')}
  </trkseg></trk>
</gpx>`;

        const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const filename = document.getElementById('filename').value.trim() || `route_${mode}`;
        a.download = `${filename}.gpx`;
        a.click();

    } catch (err) {
        console.error(err);
        alert("ルート取得に失敗しました。APIキーや座標を確認してください。");
    }
}

function saveApiKey() {
    const key = document.getElementById('apiKey').value.trim();
    if (key) {
        localStorage.setItem('ors_api_key', key);
        alert("✅ APIキーを保存しました！");
    }
}

function clearApiKey() {
    localStorage.removeItem('ors_api_key');
    document.getElementById('apiKey').value = '';
    alert("🗑️ APIキーを削除しました。");
}

window.onload = function () {
    const savedKey = localStorage.getItem('ors_api_key');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
    }
}; 