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

// Distance Data (Approximate distances in km)
const distanceMatrix = {
    "Seoul": { "Busan": 325, "Tokyo": 1150, "Osaka": 830, "New York": 11000, "Los Angeles": 9500, "London": 8800, "Paris": 8900 },
    "Busan": { "Seoul": 325, "Tokyo": 950, "Osaka": 600, "New York": 11300, "Los Angeles": 9200, "London": 9100, "Paris": 9200 },
    "Tokyo": { "Seoul": 1150, "Busan": 950, "Osaka": 400, "New York": 10800, "Los Angeles": 8800, "London": 9500, "Paris": 9700 },
    "Osaka": { "Seoul": 830, "Busan": 600, "Tokyo": 400, "New York": 11000, "Los Angeles": 9100, "London": 9500, "Paris": 9600 },
    "New York": { "Seoul": 11000, "Busan": 11300, "Tokyo": 10800, "Osaka": 11000, "Los Angeles": 3900, "London": 5500, "Paris": 5800 },
    "Los Angeles": { "Seoul": 9500, "Busan": 9200, "Tokyo": 8800, "Osaka": 9100, "New York": 3900, "London": 8700, "Paris": 9100 },
    "London": { "Seoul": 8800, "Busan": 9100, "Tokyo": 9500, "Osaka": 9500, "New York": 5500, "Los Angeles": 8700, "Paris": 340 },
    "Paris": { "Seoul": 8900, "Busan": 9200, "Tokyo": 9700, "Osaka": 9600, "New York": 5800, "Los Angeles": 9100, "London": 340 }
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

        // UI Elements - Setup
        this.setupSection = document.getElementById('setup-section');
        this.dashboardSection = document.getElementById('dashboard-section');
        this.startLocationSelect = document.getElementById('start-location');
        this.destinationLocationSelect = document.getElementById('destination-location');
        this.routeDistanceInput = document.getElementById('route-distance');
        this.saveRouteBtn = document.getElementById('save-route-btn');

        // UI Elements - Dashboard
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

        this.addEventListeners();
    }

    addEventListeners() {
        // Setup listeners for automatic distance calculation
        if (this.startLocationSelect) {
            this.startLocationSelect.addEventListener('change', () => this.calculateDistance());
        }
        if (this.destinationLocationSelect) {
            this.destinationLocationSelect.addEventListener('change', () => this.calculateDistance());
        }

        if (this.saveRouteBtn) {
            this.saveRouteBtn.addEventListener('click', () => this.saveRoute());
        }
        if (this.editRouteBtn) {
            this.editRouteBtn.addEventListener('click', () => this.showSetup());
        }

        // Run log listeners
        if (this.addRunBtn) {
            this.addRunBtn.addEventListener('click', () => this.addRun());
        }
        if (this.runDistanceInput) {
            this.runDistanceInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addRun();
            });
        }
    }

    calculateDistance() {
        const start = this.startLocationSelect.value;
        const dest = this.destinationLocationSelect.value;

        if (start && dest) {
            if (start === dest) {
                this.routeDistanceInput.value = 0;
                return;
            }
            const distance = distanceMatrix[start]?.[dest];
            if (distance) {
                this.routeDistanceInput.value = distance;
            } else {
                this.routeDistanceInput.value = "";
                console.warn("Distance not found in matrix");
            }
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
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    }

    async saveRoute() {
        const start = this.startLocationSelect.value;
        const dest = this.destinationLocationSelect.value;
        const dist = parseFloat(this.routeDistanceInput.value);

        if (!start || !dest || isNaN(dist) || dist <= 0) {
            alert('Please select a valid start and destination.');
            return;
        }

        this.startLocation = start;
        this.destinationLocation = dest;
        this.totalDistance = dist;

        try {
            await this.dbRef.update({
                startLocation: start,
                destinationLocation: dest,
                totalDistance: dist
            });
            this.showDashboard();
        } catch (error) {
            console.error("Error saving route:", error);
        }
    }

    showSetup() {
        this.setupSection.style.display = 'block';
        this.dashboardSection.style.display = 'none';
        
        if (this.startLocation) this.startLocationSelect.value = this.startLocation;
        if (this.destinationLocation) this.destinationLocationSelect.value = this.destinationLocation;
        this.routeDistanceInput.value = this.totalDistance || "";
    }

    showDashboard() {
        this.setupSection.style.display = 'none';
        this.dashboardSection.style.display = 'block';
        
        this.displayStart.textContent = this.startLocation;
        this.displayDestination.textContent = this.destinationLocation;
        this.totalDistanceSpan.textContent = this.totalDistance;
        
        this.updateDisplay();
    }

    async addRun() {
        const distance = parseFloat(this.runDistanceInput.value);

        if (isNaN(distance) || distance <= 0) {
            alert('Please enter a valid running distance.');
            return;
        }

        const date = new Date().toLocaleDateString();
        const newRun = { 
            date, 
            distance, 
            timestamp: firebase.firestore.Timestamp.now() 
        };
        
        this.runs.push(newRun);
        this.runDistanceInput.value = '';

        try {
            await this.dbRef.update({
                runs: this.runs
            });
            this.updateDisplay();
        } catch (error) {
            console.error("Error adding run:", error);
        }
    }

    updateDisplay() {
        this.runs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        const totalCoveredDistance = this.runs.reduce((sum, run) => sum + run.distance, 0);
        const remainingDistance = this.totalDistance - totalCoveredDistance;
        const completedPercentage = (totalCoveredDistance / this.totalDistance) * 100;

        if (this.completedPercentageSpan) this.completedPercentageSpan.textContent = completedPercentage.toFixed(2);
        if (this.distanceCoveredSpan) this.distanceCoveredSpan.textContent = totalCoveredDistance.toFixed(2);
        if (this.remainingDistanceSpan) this.remainingDistanceSpan.textContent = Math.max(0, remainingDistance).toFixed(2);

        if (this.progressBar) {
            this.progressBar.style.width = `${Math.min(completedPercentage, 100)}%`;
        }

        if (this.runsLeftSpan) {
            if (this.runs.length > 0) {
                const averagePace = totalCoveredDistance / this.runs.length;
                const estimatedRunsLeft = remainingDistance / averagePace;
                this.runsLeftSpan.textContent = estimatedRunsLeft > 0 ? Math.ceil(estimatedRunsLeft).toString() : '0';
            } else {
                this.runsLeftSpan.textContent = '?';
            }
        }

        if (this.runList) {
            this.runList.innerHTML = '';
            this.runs.forEach(run => {
                const dateObj = run.timestamp?.toDate() || new Date(run.date);
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <span>${dateObj.toLocaleDateString()}</span>
                    <span>${run.distance.toFixed(1)} km</span>
                `;
                this.runList.append(listItem);
            });
        }
    }

    reset() {
        this.runs = [];
        this.userId = null;
        this.dbRef = null;
        this.totalDistance = 0;
        this.startLocation = "";
        this.destinationLocation = "";
    }
}

// Main App Logic
document.addEventListener('DOMContentLoaded', () => {
    const appInstance = new RunTheWorldApp();
    const authPage = document.getElementById('auth-page');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameEl = document.getElementById('user-name');
    const userPhotoEl = document.getElementById('user-photo');

    if (!auth) return;

    auth.onAuthStateChanged(user => {
        if (user) {
            if (authPage) authPage.style.display = 'none';
            if (appContainer) appContainer.style.display = 'block';
            userNameEl.textContent = user.displayName || "User";
            userPhotoEl.src = user.photoURL || "";
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
            auth.signInWithPopup(provider).catch(err => {
                alert("Login failed: " + err.message);
            });
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }
});