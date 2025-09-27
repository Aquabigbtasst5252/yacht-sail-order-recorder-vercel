# Yacht Sail Order Recorder

This project is a web application designed to help manage and record yacht sail orders. It provides a portal for customers to view QC photos of their orders.

## Features

*   Order tracking and management.
*   Customer portal for viewing QC photos.
*   Automated email notifications when QC photos are available.

## Technologies Used

*   **Frontend:** React, Vite
*   **Backend:** Firebase Functions
*   **Database:** Firestore
*   **Authentication:** Firebase Authentication
*   **Storage:** Firebase Storage

## Setup and Installation

To run this project locally, you will need to have Node.js and npm installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Install dependencies for the frontend:**
    ```bash
    npm install
    ```

3.  **Install dependencies for the backend functions:**
    ```bash
    cd functions
    npm install
    cd ..
    ```

4.  **Create a `.env` file in the root of the project and add your Firebase configuration:**
    ```
    VITE_API_KEY=your_api_key
    VITE_AUTH_DOMAIN=your_auth_domain
    VITE_PROJECT_ID=your_project_id
    VITE_STORAGE_BUCKET=your_storage_bucket
    VITE_MESSAGING_SENDER_ID=your_messaging_sender_id
    VITE_APP_ID=your_app_id
    ```

5.  **Create a `.env` file in the `functions` directory and add your Gmail credentials:**
    ```
    GMAIL_EMAIL=your_email@gmail.com
    GMAIL_PASSWORD=your_app_password
    APP_URL=http://localhost:5173
    ```
    *Note: You may need to generate an "App Password" for your Google account to use with Nodemailer.*

6.  **Run the development server:**
    ```bash
    npm run dev
    ```

## Deployment

This project is configured for deployment with Firebase Hosting. To deploy the application, use the Firebase CLI:

```bash
firebase deploy
```