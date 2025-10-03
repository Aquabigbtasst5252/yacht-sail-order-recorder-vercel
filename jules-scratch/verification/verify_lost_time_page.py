from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console messages
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

        try:
            # Navigate to the local development server
            page.goto("http://localhost:5173", timeout=10000)

            # Wait for the first card header to be visible to ensure the page has loaded
            expect(page.locator(".card-header h3").first).to_contain_text("Daily Lost Time Recording Form", timeout=5000)

        except Exception as e:
            print(f"An error occurred: {e}")
            # Take a screenshot even on failure to help with debugging
            page.screenshot(path="jules-scratch/verification/error_screenshot.png", full_page=True)
            raise # Re-raise the exception after taking the screenshot
        finally:
            # Take a final screenshot and close the browser
            page.screenshot(path="jules-scratch/verification/verification.png", full_page=True)
            browser.close()

if __name__ == "__main__":
    run()