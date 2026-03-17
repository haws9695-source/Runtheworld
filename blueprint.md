# Project: Run the World

## Overview
"Run the World" is a web application designed to help users track their running progress towards a defined, long-distance goal. Users can set a start and end location, log their daily running distances, and see their progress. With Firebase integration, each user's data is personalized and securely stored in the cloud.

## Implemented Features
- **Google Authentication:** Users can log in using their Google account via Firebase Authentication. The authentication flow uses `signInWithRedirect` to avoid issues with browser popup blockers.
- **Cloud Data Storage:** Running history for each user is stored in a dedicated document within Firestore, ensuring data is persistent and accessible across devices.
- **Personalized UI:** The application UI updates to show the logged-in user's profile information (name and photo) and hides/shows content based on auth state.
- **Dynamic Progress Tracking:** The core features of tracking running distance, calculating progress, and estimating remaining runs are all functional and tied to the user's cloud data.
- **Run Record Management:** Users can log their daily runs and delete incorrect or accidental entries from their run history. Deleting a run automatically updates the progress bar, map position, and remaining distance.
- **Activity Mode Selection (Run vs Walk):** Users can choose between "Run the World" (km-based) and "Walk the World" (steps-based). Selecting a mode updates the app theme, titles, and input logic (1 step = 0.7m).
- **Modern and Responsive Design:** The application features a clean, card-based layout with a responsive design.

## Current Plan & Steps

### Goal
All planned features, including the migration to Firebase for authentication and data storage, are now complete. The application is a functional prototype that allows users to sign in and personally track their running progress.

### Final Implementation Notes
1.  **Firebase Configured:** The project includes the Firebase SDKs and the necessary `mcp.json` file.
2.  **User-Specific Configuration:** A placeholder `firebaseConfig` object is located at the top of `main.js`. **The user must replace this with their own Firebase project credentials to make the application functional.**
3.  **Authentication Flow:** The app now has a dedicated login page and a main application view that is only accessible after logging in. The login process uses `signInWithRedirect` for better compatibility.
4.  **Firestore Integration:** The previous `localStorage` solution has been completely replaced by Firestore. All run data is now managed in the cloud, associated with the logged-in user's unique ID.

The project is now considered feature-complete based on the user's requests.