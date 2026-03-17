// main.js

// IMPORTANT: Replace with your web app's Firebase configuration
// You can get this from your Firebase project console.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

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
        this.addRunBtn.addEventListener('click', () => this.addRun());
        this.runDistanceInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addRun();
            }
        });
    }

    async loadRuns() {
        if (!this.userId) return;
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
    }

    async addRun() {
        const distance = parseFloat(this.runDistanceInput.value);

        if (isNaN(distance) || distance <= 0) {
            alert('Please enter a valid running distance.');
            return;
        }

        const date = new Date().toLocaleDateString();
        this.runs.push({ date, distance, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        this.runDistanceInput.value = '';

        await this.dbRef.update({
            runs: this.runs
        });
        
        this.updateDisplay();
    }

    updateDisplay() {
        // Sort runs by timestamp, newest first
        this.runs.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));

        const totalCoveredDistance = this.runs.reduce((sum, run) => sum + run.distance, 0);
        const remainingDistance = this.totalDistance - totalCoveredDistance;
        const completedPercentage = (totalCoveredDistance / this.totalDistance) * 100;

        this.totalDistanceSpan.textContent = this.totalDistance;
        this.completedPercentageSpan.textContent = completedPercentage.toFixed(2);
        this.distanceCoveredSpan.textContent = totalCoveredDistance.toFixed(2);
        this.remainingDistanceSpan.textContent = remainingDistance.toFixed(2);

        this.progressBar.style.width = `${Math.min(completedPercentage, 100)}%`;

        if (this.runs.length > 0) {
            const averagePace = totalCoveredDistance / this.runs.length;
            const estimatedRunsLeft = remainingDistance / averagePace;
            this.runsLeftSpan.textContent = estimatedRunsLeft > 0 ? Math.ceil(estimatedRunsLeft).toString() : '0';
        } else {
            this.runsLeftSpan.textContent = '?';
        }

        this.runList.innerHTML = '';
        this.runs.forEach(run => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>${new Date(run.timestamp?.toDate() || run.date).toLocaleDateString()}</span>
                <span>${run.distance.toFixed(1)} km</span>
            `;
            this.runList.append(listItem); // Append to show oldest first, or prepend for newest first
        });
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
    const app = new RunTheWorldApp();

    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameEl = document.getElementById('user-name');
    const userPhotoEl = document.getElementById('user-photo');

    // Handle the redirect result
    auth.getRedirectResult().catch(error => {
        console.error("Error during redirect sign-in:", error);
    });

    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            authContainer.style.display = 'none';
            appContainer.style.display = 'block';

            userNameEl.textContent = user.displayName;
            userPhotoEl.src = user.photoURL;
            app.userId = user.uid;
            app.loadRuns();
        } else {
            // User is signed out
            authContainer.style.display = 'flex';
            appContainer.style.display = 'none';
            app.reset();
        }
    });

    // Sign in with Redirect
    loginBtn.addEventListener('click', () => {
        auth.signInWithRedirect(provider);
    });

    // Sign out
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
});