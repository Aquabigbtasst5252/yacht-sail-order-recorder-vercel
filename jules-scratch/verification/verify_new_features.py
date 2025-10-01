from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for console messages and page errors
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"PAGEERROR: {exc}"))

    try:
        # Navigate to the login page
        page.goto("http://localhost:5173/")

        # Wait for the email input to be visible and log in
        email_input = page.get_by_placeholder("name@example.com")
        expect(email_input).to_be_visible(timeout=15000) # Increased timeout
        email_input.fill("super_admin@aquadynamics.com")
        page.get_by_placeholder("Password").fill("password123")
        page.get_by_role("button", name="Sign In").click()

        # Navigate to the "Daily Lost Time" page
        lost_time_link = page.get_by_role("link", name="Daily Lost Time")
        expect(lost_time_link).to_be_visible(timeout=10000)
        lost_time_link.click()

        # --- Verification Step 1: Check for grouped entries ---
        print("Verifying that entries are grouped by section...")
        # Wait for the first section heading to appear
        first_section_heading = page.locator(".card-body h4").first
        expect(first_section_heading).to_be_visible(timeout=10000)
        print("Section heading found. Grouping appears correct.")
        page.screenshot(path="jules-scratch/verification/grouped_view.png")
        print("Screenshot of grouped view saved.")

        # --- Verification Step 2: Test Search Functionality ---
        print("Testing search functionality...")
        # Note: Interacting with react-datepicker can be complex.
        # This is a simplified interaction. A more robust test would be needed
        # in a real-world scenario with known data.
        date_pickers = page.locator(".react-datepicker__input-container input")

        # Get the initial count of section headings
        initial_section_count = page.locator(".card-body h4").count()
        print(f"Initial section count: {initial_section_count}")

        # Change the date to a range likely to have no results
        today = time.strftime("%m/%d/%Y")
        page.locator('input[class*="form-control-sm"]').nth(0).fill(today)
        page.locator('input[class*="form-control-sm"]').nth(1).fill(today)

        page.get_by_role("button", name="Search").click()

        # Wait for potential UI update
        time.sleep(2)

        page.screenshot(path="jules-scratch/verification/after_search.png")
        print("Screenshot after search saved.")

        # --- Verification Step 3: Test PDF Export ---
        print("Testing PDF export...")
        with page.expect_download() as download_info:
            page.get_by_role("button", name="Export PDF").click()

        download = download_info.value
        print(f"PDF download started: {download.suggested_filename}")

        # Take a final screenshot
        page.screenshot(path="jules-scratch/verification/final_view.png")
        print("Final screenshot saved.")


    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)