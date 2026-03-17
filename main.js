// main.js

// IMPORTANT: Replace with your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBV9cJh4Cvni2xN4X1Wd_XhzbXesg0whX0",
    authDomain: "runtheworld-55c68.firebaseapp.com",
    projectId: "runtheworld-55c68",
    storageBucket: "runtheworld-55c68.firebasestorage.app",
    messagingSenderId: "175654937851",
    appId: "1:175654937851:web:1c09a7621042d023eb7c5e",
    measurementId: "G-MGZFK2B24D"
};

// Hierarchical Location Data with Coordinates
const locationData = {
    "South Korea": {
        "Seoul": {
            "N Seoul Tower": { lat: 37.5512, lng: 126.9882 },
            "Gyeongbokgung Palace": { lat: 37.5796, lng: 126.9770 },
            "Lotte World Tower": { lat: 37.5125, lng: 127.1028 }
        },
        "Busan": {
            "Haeundae Beach": { lat: 35.1587, lng: 129.1604 },
            "Gamcheon Culture Village": { lat: 35.0975, lng: 129.0106 }
        }
    },
    "Japan": {
        "Tokyo": {
            "Tokyo Tower": { lat: 35.6586, lng: 139.7454 },
            "Shibuya Crossing": { lat: 35.6595, lng: 139.7005 }
        },
        "Osaka": {
            "Osaka Castle": { lat: 34.6873, lng: 135.5262 },
            "Dotonbori": { lat: 34.6687, lng: 135.5013 }
        }
    },
    "USA": {
        "New York": {
            "Statue of Liberty": { lat: 40.6892, lng: -74.0445 },
            "Times Square": { lat: 40.7580, lng: -73.9855 }
        },
        "Los Angeles": {
            "Hollywood Sign": { lat: 34.1341, lng: -118.3215 },
            "Santa Monica Pier": { lat: 34.0101, lng: -118.4961 }
        }
    },
    "France": {
        "Paris": {
            "Eiffel Tower": { lat: 48.8584, lng: 2.2945 },
            "Louvre Museum": { lat: 48.8606, lng: 2.3376 }
        }
    },
    "UK": {
        "London": {
            "Big Ben": { lat: 51.5007, lng: -0.1246 },
            "London Eye": { lat: 51.5033, lng: -0.1195 }
        }
    }
};

// Initialize Firebase
let app, auth, db, provider;
try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    provider = new firebase.auth.GoogleAuthProvider();
} catch (e) {
    console.error("Firebase initialization error:", e);
}

class RunTheWorldApp {
    constructor() {
        this.totalDistance = 0;
        this.startLocation = "";
        this.destinationLocation = "";
        this.startCoord = null;
        this.destCoord = null;
        this.runs = [];
        this.userId = null;
        this.dbRef = null;
        this.map = null;
        this.mapMarkers = [];
        this.mapPolyline = null;
        this.mode = 'run'; // 'run' or 'walk'

        // UI Selectors
        this.mainTitle = document.getElementById('main-title');
        this.mainSubtitle = document.getElementById('main-subtitle');
        this.startCountry = document.getElementById('start-country');
        this.startCity = document.getElementById('start-city');
        this.startLandmark = document.getElementById('start-landmark');
        this.destCountry = document.getElementById('dest-country');
        this.destCity = document.getElementById('dest-city');
        this.destLandmark = document.getElementById('dest-landmark');
        this.routeDistanceInput = document.getElementById('route-distance');
        this.saveRouteBtn = document.getElementById('save-route-btn');

        // Dashboard Elements
        this.displayStart = document.getElementById('display-start');
        this.displayDestination = document.getElementById('display-destination');
        this.totalDistanceSpan = document.getElementById('total-distance');
        this.editRouteBtn = document.getElementById('edit-route-btn');
        this.runDistanceInput = document.getElementById('run-distance');
        this.addRunBtn = document.getElementById('add-run-btn');
        this.distanceLabel = document.getElementById('distance-label');
        this.logTitle = document.getElementById('log-title');
        this.historyTitle = document.getElementById('history-title');
        this.coveredUnitLabel = document.getElementById('covered-unit-label');
        this.remainingUnitLabel = document.getElementById('remaining-unit-label');
        this.runsLeftLabel = document.getElementById('runs-left-label');
        this.completedPercentageSpan = document.getElementById('completed-percentage');
        this.distanceCoveredSpan = document.getElementById('distance-covered');
        this.remainingDistanceSpan = document.getElementById('remaining-distance');
        this.runsLeftSpan = document.getElementById('runs-left');
        this.progressBar = document.getElementById('progress-bar');
        this.runList = document.getElementById('run-list');

        this.populateCountries();
        this.addEventListeners();
    }

    populateCountries() {
        const countries = Object.keys(locationData);
        [this.startCountry, this.destCountry].forEach(select => {
            countries.forEach(country => {
                const opt = document.createElement('option');
                opt.value = country;
                opt.textContent = country;
                select.appendChild(opt);
            });
        });
    }

    addEventListeners() {
        this.startCountry.addEventListener('change', () => this.handleCountryChange(this.startCountry, this.startCity, this.startLandmark));
        this.startCity.addEventListener('change', () => this.handleCityChange(this.startCountry, this.startCity, this.startLandmark));
        this.startLandmark.addEventListener('change', () => this.calculateDistance());

        this.destCountry.addEventListener('change', () => this.handleCountryChange(this.destCountry, this.destCity, this.destLandmark));
        this.destCity.addEventListener('change', () => this.handleCityChange(this.destCountry, this.destCity, this.destLandmark));
        this.destLandmark.addEventListener('change', () => this.calculateDistance());

        if (this.saveRouteBtn) this.saveRouteBtn.addEventListener('click', () => this.saveRoute());
        if (this.editRouteBtn) this.editRouteBtn.addEventListener('click', () => this.showSetup());
        if (this.addRunBtn) this.addRunBtn.addEventListener('click', () => this.addRun());
        if (this.runDistanceInput) this.runDistanceInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addRun(); });
    }

    handleCountryChange(countrySelect, citySelect, landmarkSelect) {
        const country = countrySelect.value;
        citySelect.innerHTML = '<option value="">Select City</option>';
        landmarkSelect.innerHTML = '<option value="">Select Landmark</option>';
        landmarkSelect.disabled = true;
        if (country) {
            citySelect.disabled = false;
            Object.keys(locationData[country]).forEach(city => {
                const opt = document.createElement('option');
                opt.value = city;
                opt.textContent = city;
                citySelect.appendChild(opt);
            });
        } else { citySelect.disabled = true; }
        this.calculateDistance();
    }

    handleCityChange(countrySelect, citySelect, landmarkSelect) {
        const country = countrySelect.value;
        const city = citySelect.value;
        landmarkSelect.innerHTML = '<option value="">Select Landmark</option>';
        if (city) {
            landmarkSelect.disabled = false;
            Object.keys(locationData[country][city]).forEach(landmark => {
                const opt = document.createElement('option');
                opt.value = landmark;
                opt.textContent = landmark;
                landmarkSelect.appendChild(opt);
            });
        } else { landmarkSelect.disabled = true; }
        this.calculateDistance();
    }

    calculateDistance() {
        const sC = this.startCountry.value, sCi = this.startCity.value, sL = this.startLandmark.value;
        const dC = this.destCountry.value, dCi = this.destCity.value, dL = this.destLandmark.value;

        if (sC && sCi && sL && dC && dCi && dL) {
            this.startCoord = locationData[sC][sCi][sL];
            this.destCoord = locationData[dC][dCi][dL];
            const dist = this.haversineDistance(this.startCoord, this.destCoord);
            this.routeDistanceInput.value = dist.toFixed(1);
        } else { this.routeDistanceInput.value = ""; }
    }

    haversineDistance(c1, c2) {
        const toRad = x => x * Math.PI / 180;
        const R = 6371;
        const dLat = toRad(c2.lat - c1.lat), dLon = toRad(c2.lng - c1.lng);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(c1.lat)) * Math.cos(toRad(c2.lat)) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    initMap() {
        if (!this.map) {
            this.map = L.map('map').setView([20, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);
        }
        
        // Clear previous
        this.mapMarkers.forEach(m => this.map.removeLayer(m));
        if (this.mapPolyline) this.map.removeLayer(this.mapPolyline);
        if (this.coveredPolyline) this.map.removeLayer(this.coveredPolyline);
        this.mapMarkers = [];

        if (this.startCoord && this.destCoord) {
            const totalCovered = this.runs.reduce((s, r) => s + r.distance, 0);
            const fraction = Math.min(totalCovered / this.totalDistance, 1);

            // Interpolate current position
            const currentLat = this.startCoord.lat + (this.destCoord.lat - this.startCoord.lat) * fraction;
            const currentLng = this.startCoord.lng + (this.destCoord.lng - this.startCoord.lng) * fraction;

            const m1 = L.marker([this.startCoord.lat, this.startCoord.lng]).addTo(this.map).bindPopup("Start: " + this.startLocation);
            const m2 = L.marker([this.destCoord.lat, this.destCoord.lng]).addTo(this.map).bindPopup("Destination: " + this.destinationLocation);
            this.mapMarkers = [m1, m2];

            if (fraction > 0 && fraction < 1) {
                const emoji = this.mode === 'walk' ? '🚶' : '🏃';
                const runnerIcon = L.divIcon({
                    html: `<div style="font-size: 30px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${emoji}</div>`,
                    className: 'runner-icon',
                    iconSize: [30, 30],
                    iconAnchor: [15, 25] // Adjust anchor to center the emoji properly
                });
                const mCurrent = L.marker([currentLat, currentLng], {
                    icon: runnerIcon
                }).addTo(this.map).bindPopup("You are here! (" + (fraction * 100).toFixed(1) + "%)");
                this.mapMarkers.push(mCurrent);
            }
            
            // Remaining (Dashed Red)
            this.mapPolyline = L.polyline([
                [currentLat, currentLng],
                [this.destCoord.lat, this.destCoord.lng]
            ], { color: '#ff5252', weight: 3, dashArray: '5, 10', opacity: 0.6 }).addTo(this.map);

            // Covered (Solid Blue)
            this.coveredPolyline = L.polyline([
                [this.startCoord.lat, this.startCoord.lng],
                [currentLat, currentLng]
            ], { color: '#2196F3', weight: 5, opacity: 0.9 }).addTo(this.map);

            const group = new L.featureGroup(this.mapMarkers);
            this.map.fitBounds(group.getBounds().pad(0.3));
        }
        
        setTimeout(() => this.map.invalidateSize(), 200);
    }

    async saveRoute() {
        const dist = parseFloat(this.routeDistanceInput.value);
        if (isNaN(dist) || dist <= 0) { alert('Invalid selection'); return; }

        const modeInput = document.querySelector('input[name="activity-mode"]:checked');
        this.mode = modeInput ? modeInput.value : 'run';

        this.runs = [];
        this.startLocation = `${this.startLandmark.value} (${this.startCity.value})`;
        this.destinationLocation = `${this.destLandmark.value} (${this.destCity.value})`;
        this.totalDistance = dist;

        try {
            await this.dbRef.update({
                startLocation: this.startLocation,
                destinationLocation: this.destinationLocation,
                totalDistance: dist,
                startCoord: this.startCoord,
                destCoord: this.destCoord,
                runs: [],
                mode: this.mode
            });
            this.showDashboard();
        } catch (e) { console.error(e); }
    }

    async loadUserData() {
        if (!this.userId || !db) return;
        try {
            this.dbRef = db.collection('users').doc(this.userId);
            const doc = await this.dbRef.get();
            if (doc.exists) {
                const d = doc.data();
                this.runs = d.runs || [];
                this.mode = d.mode || 'run';
                if (d.startLocation && d.destinationLocation) {
                    this.startLocation = d.startLocation;
                    this.destinationLocation = d.destinationLocation;
                    this.totalDistance = d.totalDistance;
                    this.startCoord = d.startCoord;
                    this.destCoord = d.destCoord;
                    this.showDashboard();
                } else { this.showSetup(); }
            } else { await this.dbRef.set({ runs: [], mode: 'run' }); this.showSetup(); }
        } catch (e) { console.error(e); }
    }

    showSetup() {
        document.getElementById('setup-section').style.display = 'block';
        document.getElementById('dashboard-section').style.display = 'none';
        // Reset titles to default
        this.mainTitle.textContent = "Run the World";
        this.mainSubtitle.textContent = "Track your progress towards a global running goal!";
    }

    showDashboard() {
        document.getElementById('setup-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        
        // Update UI based on mode
        if (this.mode === 'walk') {
            this.mainTitle.textContent = "Walk the World";
            this.mainSubtitle.textContent = "Every step brings you closer to your global destination!";
            this.logTitle.textContent = "Log Your Walk";
            this.distanceLabel.textContent = "Steps Walked Today:";
            this.runDistanceInput.placeholder = "e.g. 10000";
            this.historyTitle.textContent = "Walk History";
            this.coveredUnitLabel.textContent = "Distance";
            this.remainingUnitLabel.textContent = "Distance";
            this.runsLeftLabel.textContent = "Days";
        } else {
            this.mainTitle.textContent = "Run the World";
            this.mainSubtitle.textContent = "Track your progress towards a global running goal!";
            this.logTitle.textContent = "Log Your Run";
            this.distanceLabel.textContent = "Distance Run Today (km):";
            this.runDistanceInput.placeholder = "e.g. 5.0";
            this.historyTitle.textContent = "Run History";
            this.coveredUnitLabel.textContent = "Distance";
            this.remainingUnitLabel.textContent = "Distance";
            this.runsLeftLabel.textContent = "Runs";
        }

        this.displayStart.textContent = this.startLocation;
        this.displayDestination.textContent = this.destinationLocation;
        this.totalDistanceSpan.textContent = this.totalDistance.toFixed(1);
        this.updateDisplay();
        this.initMap(); // Draw map
    }

    async addRun() {
        let d = parseFloat(this.runDistanceInput.value);
        if (isNaN(d) || d <= 0) return;

        let displayValue = "";
        if (this.mode === 'walk') {
            displayValue = `${d} steps`;
            d = (d * 0.7) / 1000; // Convert steps to km
        } else {
            displayValue = `${d.toFixed(1)} km`;
        }

        this.runs.push({ 
            date: new Date().toLocaleDateString(), 
            distance: d, 
            displayValue: displayValue,
            timestamp: firebase.firestore.Timestamp.now() 
        });
        
        this.runDistanceInput.value = '';
        await this.dbRef.update({ runs: this.runs });
        this.updateDisplay();
        this.initMap(); // Redraw map with progress
    }

    async deleteRun(timestampMillis) {
        if (!confirm('Are you sure you want to delete this record?')) return;
        this.runs = this.runs.filter(r => r.timestamp.toMillis() !== timestampMillis);
        await this.dbRef.update({ runs: this.runs });
        this.updateDisplay();
        this.initMap();
    }

    updateDisplay() {
        this.runs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        const covered = this.runs.reduce((s, r) => s + r.distance, 0);
        const remaining = this.totalDistance - covered;
        const pct = (covered / this.totalDistance) * 100;

        // Calculate average progress for "Runs Left" or "Days Left"
        let runsLeft = "?";
        if (this.runs.length > 0) {
            const avg = covered / this.runs.length;
            runsLeft = Math.ceil(remaining / avg);
        }

        this.completedPercentageSpan.textContent = pct.toFixed(2);
        this.distanceCoveredSpan.textContent = covered.toFixed(2);
        this.remainingDistanceSpan.textContent = Math.max(0, remaining).toFixed(2);
        this.runsLeftSpan.textContent = runsLeft;
        this.progressBar.style.width = `${Math.min(pct, 100)}%`;

        this.runList.innerHTML = '';
        this.runs.forEach(r => {
            const li = document.createElement('li');
            const timestampMillis = r.timestamp?.toMillis() || 0;
            const displayVal = r.displayValue || `${r.distance.toFixed(1)} km`;
            li.innerHTML = `
                <span>${r.date}</span>
                <div style="display: flex; align-items: center;">
                    <span>${displayVal}</span>
                    <button class="delete-run-btn" data-id="${timestampMillis}">Delete</button>
                </div>
            `;
            const delBtn = li.querySelector('.delete-run-btn');
            delBtn.onclick = () => this.deleteRun(parseInt(delBtn.getAttribute('data-id')));
            this.runList.appendChild(li);
        });
    }

    reset() {
        this.runs = []; this.userId = null; this.totalDistance = 0;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const appInstance = new RunTheWorldApp();
    const aP = document.getElementById('auth-page'), aC = document.getElementById('app-container');
    
    auth.onAuthStateChanged(user => {
        if (user) {
            aP.style.display = 'none'; aC.style.display = 'block';
            document.getElementById('user-name').textContent = user.displayName || "User";
            document.getElementById('user-photo').src = user.photoURL || "";
            appInstance.userId = user.uid;
            appInstance.loadUserData();
        } else {
            aP.style.display = 'flex'; aC.style.display = 'none';
            appInstance.reset();
        }
    });

    document.getElementById('login-btn').addEventListener('click', () => {
        auth.signInWithPopup(provider).catch(err => alert(err.message));
    });
    document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
});