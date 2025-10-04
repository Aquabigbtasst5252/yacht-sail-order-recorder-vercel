from playwright.sync_api import sync_playwright, expect
import re

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    def select_option(label_text, option_text=None):
        """Helper function to select an option from a react-select dropdown."""
        # Find the container div by the label text it contains.
        container = page.locator("div.mb-3", has_text=re.compile(f"^{label_text}$"))

        # Click the control part of the select component to open the dropdown.
        container.locator("div[class*='-control']").click()

        if option_text:
            # Click the option with the specified text.
            page.locator("div[class*='-option']", has_text=re.compile(f"^{option_text}$")).click()
        else:
            # If no option text is provided, click the first available option.
            page.locator("div[class*='-option']").first.click(timeout=5000)

    try:
        # Navigate to the app. The mocked state should take us to the right page.
        page.goto("http://localhost:5173")

        # Wait for the main content to load
        expect(page.get_by_role("heading", name="Daily Lost Time Recording Form")).to_be_visible(timeout=10000)

        # --- Step 1: Select Machine Breakdown and verify conditional fields ---

        # Select an employee using the helper function
        select_option("EPF Number (Employee)", "John Doe (123)")

        # Select "Machine Breakdown" from the "Lost Time Code" dropdown
        select_option("Lost Time Code", "Machine Breakdown")

        # Verify that the new dropdowns are now visible by checking for their labels' text
        expect(page.get_by_text("Machine Name")).to_be_visible()
        expect(page.get_by_text("Breakdown Reason")).to_be_visible()

        # --- Step 2: Fill out the form and submit ---

        # Select a machine
        select_option("Machine Name", "Stitching Machine 01")

        # Select a breakdown reason
        select_option("Breakdown Reason", "M-01 - Needle broken")

        # Click the save button
        page.get_by_role("button", name="Save Entry").click()

        # --- Step 3: Verify the new entry in the correct tab ---

        # Wait for the success toast to appear
        expect(page.get_by_text("Lost time entry saved successfully!")).to_be_visible()

        # Click the "Machine Breakdown" tab
        machine_breakdown_tab = page.get_by_role("button", name=re.compile(r"Machine Breakdown", re.IGNORECASE))
        expect(machine_breakdown_tab).to_be_enabled()
        machine_breakdown_tab.click()

        # Wait for the table to update by checking for the specific table header
        expect(page.get_by_role("cell", name="Machine Name")).to_be_visible()

        # Verify that the new entry's data is visible in the table
        row = page.locator("tbody tr").first
        expect(row.get_by_text("Stitching Machine 01")).to_be_visible()
        expect(row.get_by_text("M-01 - Needle broken")).to_be_visible()

        # Take a screenshot for visual confirmation
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)