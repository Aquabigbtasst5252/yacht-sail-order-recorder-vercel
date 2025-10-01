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
        # 1. Login
        page.goto("http://localhost:5173/")
        email_input = page.get_by_placeholder("name@example.com")
        expect(email_input).to_be_visible(timeout=15000)
        email_input.fill("super_admin@aquadynamics.com")
        page.get_by_placeholder("Password").fill("password123")
        page.get_by_role("button", name="Sign In").click()

        # 2. Navigate to Admin Panel
        print("Navigating to Admin Panel...")
        # Click the dropdown toggle to reveal the Admin Panel link
        page.locator('button[data-bs-toggle="dropdown"]').click()
        admin_panel_link = page.get_by_role("link", name="Admin Panel")
        expect(admin_panel_link).to_be_visible(timeout=10000)
        admin_panel_link.click()
        print("On Admin Panel page.")

        # 3. Navigate to Machine Breakdown Tab
        print("Navigating to Machine Breakdown tab...")
        machine_breakdown_tab = page.get_by_role("button", name="Machine Breakdown")
        expect(machine_breakdown_tab).to_be_visible(timeout=5000)
        machine_breakdown_tab.click()
        print("On Machine Breakdown tab.")

        # 4. Navigate to Employees Tab
        print("Navigating to Employees tab...")
        employees_tab_button = page.get_by_role("button", name="Employees")
        expect(employees_tab_button).to_be_visible(timeout=5000)
        employees_tab_button.click()
        print("On Employees tab.")

        # 5. Verify the new section tabs are visible
        print("Verifying section-based tabs...")
        # Check for one of the new tabs, e.g., "Sticking"
        sticking_section_tab = page.locator('.nav-tabs .nav-link:text("Sticking")').first
        expect(sticking_section_tab).to_be_visible(timeout=5000)
        print("Section tabs are visible.")

        # Take a screenshot for visual confirmation
        page.screenshot(path="jules-scratch/verification/employee_management_tabs.png")
        print("Screenshot of the new employee tabs saved successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)