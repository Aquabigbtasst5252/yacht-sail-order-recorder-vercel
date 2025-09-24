# Verification Steps for New Features

Hello! Here is a guide on how to check each of the new features and fixes I've implemented.

### 1. Default to Current Week & Reverting Shipped Orders
-   **Go to:** The **Production Schedule** page.
-   **Check 1 (Default Week):** The page should automatically load and display the schedule for the current week without you needing to select it from the dropdown.
-   **Check 2 (Revert Status):** Find the "Shipped Orders" accordion at the bottom and expand it. The status dropdowns for these orders should be enabled. Try changing one back to a production status (e.g., "QC"). The order should move from the "Shipped" list to the main schedule table above.

### 2. New "Shipped Orders" Page
-   **Go to:** The **Production Schedule** page.
-   **Check:** You should see a new tab labeled **"Shipped Orders"**. Click it to view a list of all shipped orders, grouped by customer, with a search bar. You can also revert a "Shipped" status from this view.

### 3. Fix for Calendar Week Number
-   **Go to:** The **Production Schedule** page, then click the **"All Active Orders"** tab.
-   **Action:** Click on any of the date picker inputs in the "Delivery Date" column.
-   **Check:** The week numbers displayed down the left side of the calendar should now be correct.

### 4. Excel Export
-   **Go to:** The **Order List** page from the main header.
-   **Action:** Click the green **"Export"** button next to the search bar.
-   **Check:** An Excel file named `AllOrders.xlsx` should download. Open it and confirm that it has two sheets, "Sails" and "Accessories", with the corresponding orders on each.

### 5. Status Consistency
-   **Action:** After you revert an order from "Shipped" back to a production status (as in step 1 or 2), navigate to the **"All Active Orders"** tab.
-   **Check:** The order you just reverted should now be visible in this list.

Please go through these steps to verify the changes. Let me know if everything works as expected or if you run into any issues.
