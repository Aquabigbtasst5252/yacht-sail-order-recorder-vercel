from playwright.sync_api import sync_playwright, Page, expect

def verify_employees_by_section(page: Page):
    """
    Logs into the application, navigates to the employee management page,
    and verifies that employees are grouped by section.
    """
    # 1. Navigate to the application's homepage and wait for it to be ready.
    page.goto("http://localhost:5173/")
    page.wait_for_load_state("networkidle")

    # 2. Log in as an administrator.
    # Use placeholder text to locate the input fields for more reliability.
    page.get_by_placeholder("name@example.com").fill("test@example.com")
    page.get_by_placeholder("Password").fill("password")
    page.get_by_role("button", name="Sign In").click()

    # 3. Navigate to the Admin Panel.
    # After login, the user should be on the dashboard.
    # The 'Admin' navigation link should be present for admin users.
    admin_button = page.get_by_role("button", name="Admin")
    admin_button.click()

    # 4. Navigate to the correct tab.
    # Click the "Machine Breakdown" tab.
    machine_breakdown_tab = page.get_by_role("button", name="Machine Breakdown")
    machine_breakdown_tab.click()

    # Click the "Employees" tab within the Machine Breakdown section.
    employees_tab = page.get_by_role("button", name="Employees")
    employees_tab.click()

    # 5. Assert that section headings are visible.
    # This confirms the grouping logic is working before taking the screenshot.
    expect(page.get_by_role("heading", name="Sticking")).to_be_visible()
    expect(page.get_by_role("heading", name="Sewing")).to_be_visible()

    # 6. Take a screenshot for visual confirmation.
    page.screenshot(path="jules-scratch/verification/employees_by_section.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_employees_by_section(page)
        browser.close()

if __name__ == "__main__":
    main()