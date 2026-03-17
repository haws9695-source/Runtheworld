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
        this.totalDistance = 500;
        this.runs = [];
        this.userId = null;
        this.dbRef = null;

        // UI Elements
        this.runDistanceInput = document.getElementById('run-distance');
        this.addRunBtn = document.getElementById('add-run-btn');
        this.totalDistanceSpan = document.getElementById('total-distance');
        this.completedPercentageSpan = document.getElementById('completed-percentage');
        this.distanceCoveredSpan = document.getElementById('distance-covered');
        this.remainingDistanceSpan = document.getElementById('remaining-distance');
        this.runsLeftSpan = document.getElementById('runs-left');
        this.progressBar = document.getElementById('progress-bar');
        this.runList = document.getElementById('run-list');

        this.addEventListeners();
    }

    addEventListeners() {
        if (this.addRunBtn) {
            this.addRunBtn.addEventListener('click', () => this.addRun());
        }
        if (this.runDistanceInput) {
            this.runDistanceInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addRun();
                }
            });
        }
    }

    async loadRuns() {
        if (!this.userId || !db) return;
        try {
            this.dbRef = db.collection('users').doc(this.userId);
            const doc = await this.dbRef.get();
            if (doc.exists) {
                this.runs = doc.data().runs || [];
            } else {
                // Create a new document for the user
                await this.dbRef.set({ runs: [] });
                this.runs = [];
            }
            this.updateDisplay();
        } catch (error) {
            console.error("Error loading runs:", error);
        }
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
            alert("Failed to save run. Make sure your Firestore rules allow writes.");
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

        if (this.totalDistanceSpan) this.totalDistanceSpan.textContent = this.totalDistance;
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
        this.updateDisplay();
    }
}

// Main App Logic
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing app logic...");
    
    const appInstance = new RunTheWorldApp();

    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameEl = document.getElementById('user-name');
    const userPhotoEl = document.getElementById('user-photo');

    if (!auth) {
        console.error("Firebase Auth not initialized. Check your config.");
        return;
    }

    // Handle the redirect result
    auth.getRedirectResult().then((result) => {
        if (result.user) {
            console.log("Redirect login successful:", result.user.displayName);
        }
    }).catch(error => {
        console.error("Error during redirect sign-in:", error);
        if (error.code === 'auth/operation-not-allowed') {
            alert("Google Sign-In is not enabled in your Firebase Console. Please enable it under Authentication > Sign-in method.");
        } else {
            alert("Login error: " + error.message);
        }
    });

    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("User state: Signed In", user.displayName);
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';

            userNameEl.textContent = user.displayName;
            userPhotoEl.src = user.photoURL;
            appInstance.userId = user.uid;
            appInstance.loadRuns();
        } else {
            console.log("User state: Signed Out");
            authContainer.style.display = 'flex';
            appContainer.style.display = 'none';
            appInstance.reset();
        }
    });

    // Sign in with Redirect
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log("Login button clicked, starting redirect...");
            if (firebaseConfig.apiKey === "YOUR_API_KEY") {
                alert("Please set your Firebase API Key in main.js first!");
                return;
            }
            auth.signInWithRedirect(provider).catch(err => {
                console.error("Sign in error:", err);
                alert("Sign in failed: " + err.message);
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