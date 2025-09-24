# Configuration for Email Notifications

Hello! I have updated the email notification function as you requested.

To make the link in the email work correctly, you need to configure one new environment variable for your Cloud Functions.

### Required Action

You need to set the `APP_URL` variable. This tells the function what the main URL of your application is.

Please run the following command in your terminal from the root of the project. **Remember to replace `https://your-app-url.com` with the actual URL of your live application.**

```bash
firebase functions:config:set app.url="https://your-app-url.com"
```

After running this command, you will need to **re-deploy your functions** for the new configuration to take effect:

```bash
firebase deploy --only functions
```

This will complete the setup. The new emails will now be sent with the correct link.
