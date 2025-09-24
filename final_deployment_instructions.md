# Final Configuration and Deployment Guide

Hello! Here are the answers to your recent questions.

### 1. Have the files been pushed to GitHub?

Not yet. All the new changes we have been working on (the email updates, production schedule features, etc.) are currently on a development branch named **`feature/production-schedule-updates`**.

I am waiting for you to test and confirm that everything works as you expect. Once you give your approval, I will submit the code for a final review and merge.

### 2. How to add your email (`aquachamal2@gmail.com`) to the webapp?

The application uses a Cloud Function to send emails via your Gmail account. To make this work, you must securely provide your email address and a special password to the function's environment configuration.

Please follow these steps carefully:

#### **Step A: Generate a Google App Password (CRITICAL STEP)**

If you use 2-Step Verification on your Google account (which is highly recommended), you **cannot** use your regular password. You must generate an **App Password** for this application to use.

1.  Go to your Google Account settings: [https://myaccount.google.com/](https://myaccount.google.com/)
2.  Navigate to the **Security** section.
3.  Under "How you sign in to Google", click on **2-Step Verification**. You may need to sign in again.
4.  Scroll to the very bottom and click on **App passwords**.
5.  When asked to "Select app", choose **"Other (Custom name)"**. Name it something like "Aqua Dynamics App".
6.  Click **Generate**.
7.  A 16-character password will be displayed. **Copy this password now.** This is what you will use in the next step.

#### **Step B: Set the Email and Password in Firebase**

Open your terminal in the root directory of the project and run the following commands.

-   Use the **16-character App Password** you just generated, not your main Google password.

```bash
# Set the sender email address
firebase functions:config:set gmail.email="aquachamal2@gmail.com"

# Set the App Password you generated
firebase functions:config:set gmail.password="the-16-character-password-goes-here"
```

#### **Step C: Set the Application URL (If you haven't already)**

The email also needs the URL of your application for the link.

```bash
# IMPORTANT: Replace with your actual, live application URL
firebase functions:config:set app.url="https://your-app-url.com"
```

#### **Step D: Deploy the Cloud Functions**

After setting all the configurations, you must re-deploy your functions for the new settings to take effect.

```bash
firebase deploy --only functions
```

After completing all these steps, the email system should be fully configured and ready for you to test. Let me know how it goes!
