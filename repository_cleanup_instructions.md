# Critical Security Action: Removing Leaked API Key from Git History

We have confirmed that an API key was leaked into your repository's history. The following steps are required to permanently remove it and secure your application. Please follow them carefully.

### **Phase 1: Immediate Containment (If you haven't already)
**
1.  **Revoke the Leaked Key:** Go to your [Google Cloud Console's API Credentials page](https://console.cloud.google.com/apis/credentials). Find the leaked API key (`AIzaSy...`) and **delete it immediately**.
2.  **Generate a New Key:** Create a new API key. You will use this new, safe key later.

### **Phase 2: Clean Your Git Repository History**

Simply committing a fix is not enough; the secret will still be in the git history. We must rewrite the history to remove all traces of the key. We will use the official, recommended tool `git-filter-repo`.

**1. Install `git-filter-repo`:**

If you don't have it, you need to install it. The recommended way is with your system's package manager.

*   **macOS (Homebrew):** `brew install git-filter-repo`
*   **Debian/Ubuntu:** `sudo apt-get update && sudo apt-get install git-filter-repo`
*   **Other systems:** You can use `pip install git-filter-repo` or see the [official installation instructions](https://github.com/newren/git-filter-repo/blob/main/INSTALL.md).

**2. Create a "Secrets" File:**

In the root directory of your project, create a file named `secrets-to-remove.txt`. Put the leaked key inside this file. The content of the file should be exactly this:

```
AIzaSyCAzaVznj_lFYNfmFaAXt8fM28iPrmAa2c
```

**3. Run the Cleanup Command:**

Run the following command in your terminal from the root of your project. This command will go through your entire project history and remove the key.

```bash
git filter-repo --invert-paths --path secrets-to-remove.txt --strip-blobs-with-ids
```

**4. Push the Cleaned History to GitHub:**

After the history is rewritten locally, you must force push the changes to overwrite the compromised history on GitHub.

**WARNING:** This is a destructive action and will overwrite the remote history. Ensure all collaborators have saved any work they have not yet pushed.

```bash
git push origin --force --all
git push origin --force --tags
```

### **Phase 3: Final Steps**

1.  **Update Your Local Environment:** Open your `.env.local` file and replace the old, revoked key with the **new API key** you generated in Phase 1.
2.  **Inform Collaborators:** Anyone else who has a copy of this repository must delete their local copy and re-clone it from GitHub to ensure they have the clean history.

After completing these steps, your repository will be secure. I am here to help if you have any questions about this process.
