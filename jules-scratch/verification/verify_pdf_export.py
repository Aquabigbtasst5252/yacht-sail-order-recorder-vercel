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

        # Wait for 5 seconds to allow the page to load and for any errors to surface
        time.sleep(5)

        # Take a screenshot to see the state of the page
        page.screenshot(path="jules-scratch/verification/debug_screenshot.png")
        print("Debug screenshot taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)