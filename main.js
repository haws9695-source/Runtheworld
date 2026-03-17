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
        this.runs = [];
        this.userId = null;
        this.dbRef = null;

        // UI Selectors - Start
        this.startCountry = document.getElementById('start-country');
        this.startCity = document.getElementById('start-city');
        this.startLandmark = document.getElementById('start-landmark');

        // UI Selectors - Destination
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
        // Start Location Hierarchy
        this.startCountry.addEventListener('change', () => this.handleCountryChange(this.startCountry, this.startCity, this.startLandmark));
        this.startCity.addEventListener('change', () => this.handleCityChange(this.startCountry, this.startCity, this.startLandmark));
        this.startLandmark.addEventListener('change', () => this.calculateDistance());

        // Destination Hierarchy
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
            const cities = Object.keys(locationData[country]);
            cities.forEach(city => {
                const opt = document.createElement('option');
                opt.value = city;
                opt.textContent = city;
                citySelect.appendChild(opt);
            });
        } else {
            citySelect.disabled = true;
        }
        this.calculateDistance();
    }

    handleCityChange(countrySelect, citySelect, landmarkSelect) {
        const country = countrySelect.value;
        const city = citySelect.value;
        landmarkSelect.innerHTML = '<option value="">Select Landmark</option>';

        if (city) {
            landmarkSelect.disabled = false;
            const landmarks = Object.keys(locationData[country][city]);
            landmarks.forEach(landmark => {
                const opt = document.createElement('option');
                opt.value = landmark;
                opt.textContent = landmark;
                landmarkSelect.appendChild(opt);
            });
        } else {
            landmarkSelect.disabled = true;
        }
        this.calculateDistance();
    }

    calculateDistance() {
        const sCountry = this.startCountry.value;
        const sCity = this.startCity.value;
        const sLandmark = this.startLandmark.value;

        const dCountry = this.destCountry.value;
        const dCity = this.destCity.value;
        const dLandmark = this.destLandmark.value;

        if (sCountry && sCity && sLandmark && dCountry && dCity && dLandmark) {
            const startCoord = locationData[sCountry][sCity][sLandmark];
            const destCoord = locationData[dCountry][dCity][dLandmark];
            
            const distance = this.haversineDistance(startCoord, destCoord);
            this.routeDistanceInput.value = distance.toFixed(1);
        } else {
            this.routeDistanceInput.value = "";
        }
    }

    haversineDistance(coords1, coords2) {
        const toRad = (x) => x * Math.PI / 180;
        const R = 6371; // Earth's radius in km

        const dLat = toRad(coords2.lat - coords1.lat);
        const dLon = toRad(coords2.lng - coords1.lng);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(coords1.lat)) * Math.cos(toRad(coords2.lat)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    async saveRoute() {
        const start = this.startLandmark.value;
        const dest = this.destLandmark.value;
        const dist = parseFloat(this.routeDistanceInput.value);

        if (!start || !dest || isNaN(dist) || dist <= 0) {
            alert('Please select valid start and destination landmarks.');
            return;
        }

        this.runs = [];
        this.startLocation = `${start} (${this.startCity.value})`;
        this.destinationLocation = `${dest} (${this.destCity.value})`;
        this.totalDistance = dist;

        try {
            await this.dbRef.update({
                startLocation: this.startLocation,
                destinationLocation: this.destinationLocation,
                totalDistance: dist,
                runs: []
            });
            this.showDashboard();
            this.updateDisplay();
        } catch (error) {
            console.error("Error saving route:", error);
        }
    }

    async loadUserData() {
        if (!this.userId || !db) return;
        try {
            this.dbRef = db.collection('users').doc(this.userId);
            const doc = await this.dbRef.get();
            if (doc.exists) {
                const data = doc.data();
                this.runs = data.runs || [];
                if (data.startLocation && data.destinationLocation && data.totalDistance) {
                    this.startLocation = data.startLocation;
                    this.destinationLocation = data.destinationLocation;
                    this.totalDistance = data.totalDistance;
                    this.showDashboard();
                } else {
                    this.showSetup();
                }
            } else {
                await this.dbRef.set({ runs: [] });
                this.showSetup();
            }
        } catch (error) { console.error(error); }
    }

    showSetup() {
        document.getElementById('setup-section').style.display = 'block';
        document.getElementById('dashboard-section').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('setup-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'block';
        this.displayStart.textContent = this.startLocation;
        this.displayDestination.textContent = this.destinationLocation;
        this.totalDistanceSpan.textContent = this.totalDistance;
        this.updateDisplay();
    }

    async addRun() {
        const distance = parseFloat(this.runDistanceInput.value);
        if (isNaN(distance) || distance <= 0) { alert('Invalid distance'); return; }

        const newRun = { 
            date: new Date().toLocaleDateString(), 
            distance, 
            timestamp: firebase.firestore.Timestamp.now() 
        };
        this.runs.push(newRun);
        this.runDistanceInput.value = '';

        try {
            await this.dbRef.update({ runs: this.runs });
            this.updateDisplay();
        } catch (error) { console.error(error); }
    }

    updateDisplay() {
        this.runs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        const totalCovered = this.runs.reduce((sum, run) => sum + run.distance, 0);
        const remaining = this.totalDistance - totalCovered;
        const percentage = (totalCovered / this.totalDistance) * 100;

        this.completedPercentageSpan.textContent = percentage.toFixed(2);
        this.distanceCoveredSpan.textContent = totalCovered.toFixed(2);
        this.remainingDistanceSpan.textContent = Math.max(0, remaining).toFixed(2);
        this.progressBar.style.width = `${Math.min(percentage, 100)}%`;

        if (this.runs.length > 0) {
            const avg = totalCovered / this.runs.length;
            this.runsLeftSpan.textContent = remaining > 0 ? Math.ceil(remaining / avg) : '0';
        } else { this.runsLeftSpan.textContent = '?'; }

        this.runList.innerHTML = '';
        this.runs.forEach(run => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${run.date}</span><span>${run.distance.toFixed(1)} km</span>`;
            this.runList.appendChild(li);
        });
    }

    reset() {
        this.runs = []; this.userId = null; this.dbRef = null;
        this.totalDistance = 0; this.startLocation = ""; this.destinationLocation = "";
    }
}

// Main App Logic
document.addEventListener('DOMContentLoaded', () => {
    const appInstance = new RunTheWorldApp();
    const authPage = document.getElementById('auth-page');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (!auth) return;

    auth.onAuthStateChanged(user => {
        if (user) {
            if (authPage) authPage.style.display = 'none';
            if (appContainer) appContainer.style.display = 'block';
            document.getElementById('user-name').textContent = user.displayName || "User";
            document.getElementById('user-photo').src = user.photoURL || "";
            appInstance.userId = user.uid;
            appInstance.loadUserData();
        } else {
            if (authPage) authPage.style.display = 'flex';
            if (appContainer) appContainer.style.display = 'none';
            appInstance.reset();
        }
    });

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            auth.signInWithPopup(provider).catch(err => alert(err.message));
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => auth.signOut());
    }
});