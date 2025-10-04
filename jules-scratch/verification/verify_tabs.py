import re
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the local development server
        page.goto("http://localhost:5173")

        # Wait for the tabs to be visible
        expect(page.locator(".nav-tabs")).to_be_visible()

        # Verify the "All" tab is active by default and take a screenshot
        expect(page.get_by_role("button", name="All")).to_have_class(re.compile(r"active"))
        page.screenshot(path="jules-scratch/verification/tabs_all_view.png", full_page=True)

        # Click on the "Section A" tab
        page.get_by_role("button", name="Section A").click()

        # Verify that the "Section A" tab is now active
        expect(page.get_by_role("button", name="Section A")).to_have_class(re.compile(r"active"))

        # Take a screenshot of the "Section A" view
        page.screenshot(path="jules-scratch/verification/tabs_section_a_view.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    run()