import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test("capture visual verification screenshots", async ({ page, browser }) => {
  const outDir = path.resolve("C:/Users/vladi/.gemini/antigravity/brain/2c5be7e8-ad09-4002-86b0-81953c8123c3/screenshots");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Landing Page
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Split expenses, not friendships." })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "01_landing_page.png"), fullPage: true });

  // 2. Login Page
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "02_login_page.png") });

  // 3. Login as Alice & Dashboard
  await page.fill('input[id="email"]', "alice@example.com");
  await page.fill('input[id="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Apartment 4B Roommates")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "03_dashboard.png"), fullPage: true });

  // 4. Group Expenses View (Page 1 top item is "Late Night Pizza Delivery")
  await page.click('text="Apartment 4B Roommates"');
  await page.waitForURL("**/groups/**");
  await expect(page.getByText("Late Night Pizza Delivery")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "04_group_expenses.png"), fullPage: true });

  // 5. Balances & Suggested Payments View
  await page.click('button:has-text("balances")');
  await expect(page.getByText("Suggested Payments")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "05_group_balances.png"), fullPage: true });

  // 6. Stats View
  await page.click('button:has-text("stats")');
  await expect(page.getByText("Spending by Category")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "06_group_stats.png"), fullPage: true });

  // 7. Add Expense Form with Live Preview
  await page.click('button:has-text("Add Expense")');
  await page.waitForURL("**/expenses/new");
  await page.fill('input[id="description"]', "Weekly Pizza Party");
  await page.fill('input[id="amount-(eur)"]', "48.50");
  await page.click('button:has-text("shares")');
  await expect(page.getByText("Balanced (€48.50)")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "07_expense_form_live_preview.png"), fullPage: true });

  // 8. Mobile Viewport at 375px
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("/login");
  await mobilePage.fill('input[id="email"]', "alice@example.com");
  await mobilePage.fill('input[id="password"]', "password123");
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForURL("**/dashboard");
  await expect(mobilePage.getByText("Apartment 4B Roommates")).toBeVisible();
  await mobilePage.screenshot({ path: path.join(outDir, "08_mobile_dashboard_375px.png"), fullPage: true });
  await mobileContext.close();
});
