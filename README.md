# Yacht Sail Order Management System

This is a comprehensive client portal for Aqua Dynamics, a yacht sail manufacturing company. It allows customers and internal staff to manage yacht sail orders, track production status, and view stock levels in real-time.

## Key Features

- **Role-Based Access Control:** Differentiated user experiences for Customers, Production staff, and Super Admins.
- **Order Management:**
  - Create new orders for sails and accessories.
  - View, edit, and cancel existing orders.
  - Automatically generates unique order numbers (e.g., S101 for sails, A201 for accessories).
- **Production Tracking:**
  - Assign and update production statuses for each order (e.g., Cutting, Stitching, QC).
  - View a weekly production schedule based on planned delivery dates.
- **Customer Portal:**
  - Customers can view the status of their own orders.
  - Access to a dedicated stock management page.
- **IHC Sail Management:**
  - Special handling for IHC (International Handicap Certificate) sails.
  - Upload and manage IHC sticker images and serial numbers.
- **Quality Control:**
  - Upload and view QC photos for each order.
  - Automated email notifications to customers when QC photos are available.
- **Admin Panel:**
  - Manage user accounts, roles, and status.
  - Manage customer profiles.
  - Manage system data such as order types, product types, and production statuses.

## Technology Stack

- **Frontend:** [React](https://reactjs.org/) with [Vite](https://vitejs.dev/)
- **Backend:** [Firebase](https://firebase.google.com/)
  - **Authentication:** Firebase Auth (Email/Password & Google Sign-In)
  - **Database:** Cloud Firestore
  - **Storage:** Cloud Storage for file uploads
  - **Serverless Functions:** Cloud Functions for Firebase (e.g., for sending emails)
- **Styling:** [Bootstrap 5](https://getbootstrap.com/)
- **Email:** [Nodemailer](https://nodemailer.com/) (used within a Cloud Function)

## Local Development Setup

To run this project on your local machine, please follow these steps.

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v22 or later recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A Firebase project.

### 2. Installation

Clone the repository and install the required npm packages.

```bash
git clone <repository-url>
cd <repository-directory>
npm install
```

### 3. Firebase Configuration

The application requires Firebase credentials to connect to the backend.

1.  **Create a `.env.local` file** in the root of the project by making a copy of the `.env.example` file.
    ```bash
    cp .env.example .env.local
    ```

2.  **Get your Firebase credentials:**
    - Go to the [Firebase Console](https://console.firebase.google.com/).
    - Select your project.
    - Click the gear icon (⚙️) next to "Project Overview" and go to **Project settings**.
    - In the "General" tab, scroll down to the "Your apps" section.
    - Click on your web app.
    - Look for the `firebaseConfig` object in the "Firebase SDK snippet" section.

3.  **Update your `.env.local` file:**
    Open `.env.local` and replace the placeholder values with the actual values from your `firebaseConfig` object.

    ```
    VITE_API_KEY="YOUR_API_KEY"
    VITE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
    # ... and so on for all the variables
    ```

### 4. Running the Application

Once the installation and configuration are complete, you can start the Vite development server.

```bash
npm run dev
```

The application should now be running on `http://localhost:5173` (or another port if 5173 is in use).

## Deployment

This application is configured for deployment on **Firebase Hosting**. The `firebase.json` file contains the necessary configuration for deploying the frontend application and the associated Cloud Functions. To deploy, use the Firebase CLI:

```bash
firebase deploy
```
