// main.js

// IMPORTANT: Replace with your web app's Firebase configuration
// You can get this from your Firebase project console.
const firebaseConfig = {
    apiKey: "AIzaSyBV9cJh4Cvni2xN4X1Wd_XhzbXesg0whX0",
    authDomain: "runtheworld-55c68.firebaseapp.com",
    projectId: "runtheworld-55c68",
    storageBucket: "runtheworld-55c68.firebasestorage.app",
    messagingSenderId: "175654937851",
    appId: "1:175654937851:web:1c09a7621042d023eb7c5e",
    measurementId: "G-MGZFK2B24D"
  };

// Check if placeholders are still present
if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.warn("Firebase configuration is not set up! Please update main.js with your project credentials.");
}

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
        this.startLocationInput = document.getElementById('start-location');
        this.destinationLocationInput = document.getElementById('destination-location');
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
        // Setup listeners
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
                // New user
                await this.dbRef.set({ runs: [] });
                this.showSetup();
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        }
    }

    async saveRoute() {
        const start = this.startLocationInput.value.trim();
        const dest = this.destinationLocationInput.value.trim();
        const dist = parseFloat(this.routeDistanceInput.value);

        if (!start || !dest || isNaN(dist) || dist <= 0) {
            alert('Please fill in all fields with valid information.');
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
            alert("Failed to save route. Check Firestore rules.");
        }
    }

    showSetup() {
        this.setupSection.style.display = 'block';
        this.dashboardSection.style.display = 'none';
        
        // Pre-fill if editing
        this.startLocationInput.value = this.startLocation;
        this.destinationLocationInput.value = this.destinationLocation;
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
        // Sort runs by timestamp, newest first
        this.runs.sort((a, b) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });

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
    console.log("DOM loaded, initializing app logic...");
    
    const appInstance = new RunTheWorldApp();

    const authPage = document.getElementById('auth-page');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameEl = document.getElementById('user-name');
    const userPhotoEl = document.getElementById('user-photo');

    if (!auth) {
        console.error("Firebase Auth not initialized. Check your config.");
        return;
    }

    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
        try {
            if (user) {
                console.log("User state: Signed In", user.displayName);
                if (authPage) authPage.style.display = 'none';
                if (appContainer) appContainer.style.display = 'block';

                userNameEl.textContent = user.displayName || "User";
                userPhotoEl.src = user.photoURL || "";
                appInstance.userId = user.uid;
                appInstance.loadUserData(); // Load route and runs
            } else {
                console.log("User state: Signed Out");
                if (authPage) authPage.style.display = 'flex';
                if (appContainer) appContainer.style.display = 'none';
                appInstance.reset();
            }
        } catch (err) {
            console.error("Auth state change error:", err);
        }
    });

    // Sign in with Popup
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            auth.signInWithPopup(provider).catch(err => {
                console.error("Sign in error:", err);
                alert("Login failed: " + err.message);
            });
        });
    }

    // Sign out
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }
});