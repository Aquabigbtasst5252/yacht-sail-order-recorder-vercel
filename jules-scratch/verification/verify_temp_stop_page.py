from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    time.sleep(10) # Wait for the server to start
    page.goto("http://localhost:5173")

    # Mock user authentication
    page.evaluate('''() => {
        const appRoot = document.getElementById('root');
        if (appRoot) {
            const instanceKey = Object.keys(appRoot).find(key => key.startsWith('__reactFiber$'));
            if (instanceKey) {
                appRoot[instanceKey].return.stateNode.setState({
                    user: { uid: 'mock-uid' },
                    userData: { name: 'Mock User', role: 'super_admin' }
                });
            }
        }
    }''')

    # Click the dropdown to open it
    page.click('button[data-bs-toggle="dropdown"]')

    # Click the "Temporary Stop" link in the dropdown
    page.click('a.dropdown-item[href="#"][onclick*="temporary-stop"]')

    page.screenshot(path="jules-scratch/verification/temporary_stop_page.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
