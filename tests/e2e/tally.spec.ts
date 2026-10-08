import { test, expect } from "@playwright/test";

test.describe("Tally Core User Journey", () => {
  const timestamp = Date.now();
  const userA = {
    name: "E2E User A",
    email: `user_a_${timestamp}@example.com`,
    password: "password123",
  };
  const userB = {
    name: "E2E User B",
    email: `user_b_${timestamp}@example.com`,
    password: "password123",
  };

  test("full journey: register, group creation, invite join, uneven split, balance check, settlement", async ({
    browser,
  }) => {
    // Context 1: User A
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // 1. User A Registers
    await pageA.goto("/register");
    await pageA.fill('input[id="full-name"]', userA.name);
    await pageA.fill('input[id="email"]', userA.email);
    await pageA.fill('input[id="password"]', userA.password);
    await pageA.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(pageA).toHaveURL(/.*dashboard/);
    await expect(pageA.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // 2. User A Creates Group
    await pageA.click('text="Create Group"');
    await expect(pageA).toHaveURL(/.*groups\/new/);
    await pageA.fill('input[id="group-name"]', "E2E Road Trip Group");
    await pageA.fill('textarea[id="group-description"]', "Trip to the mountains");
    await pageA.selectOption('select[id="currency-selector"]', "EUR");
    await pageA.click('button[type="submit"]');

    // Wait for redirect to group details (not /groups/new)
    await expect(pageA).toHaveURL(/\/groups\/(?!new)[a-zA-Z0-9_-]+/);
    await expect(pageA.getByRole("heading", { name: "E2E Road Trip Group" })).toBeVisible();

    // 3. User A gets invite link from Settings
    const groupUrl = pageA.url();
    const groupId = groupUrl.split("/groups/")[1];

    await pageA.goto(`/groups/${groupId}/settings`);
    await expect(pageA.getByRole("heading", { name: "Group Settings" })).toBeVisible();

    const inviteInput = pageA.locator("input[readonly]");
    const inviteLink = await inviteInput.inputValue();
    expect(inviteLink).toContain("/invite/");

    // Context 2: User B Registers and Joins
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // User B Registers
    await pageB.goto("/register");
    await pageB.fill('input[id="full-name"]', userB.name);
    await pageB.fill('input[id="email"]', userB.email);
    await pageB.fill('input[id="password"]', userB.password);
    await pageB.click('button[type="submit"]');
    await expect(pageB).toHaveURL(/.*dashboard/);

    // User B visits invite link
    await pageB.goto(inviteLink);
    await expect(pageB.getByRole("heading", { name: "E2E Road Trip Group" })).toBeVisible();
    await pageB.click('button:has-text("Join E2E Road Trip Group")');

    // User B joins and is redirected to group page
    await expect(pageB).toHaveURL(new RegExp(`.*groups/${groupId}`));
    await expect(pageB.getByRole("heading", { name: "E2E Road Trip Group" })).toBeVisible();

    // 4. User A Adds Expense with Uneven Split
    await pageA.goto(`/groups/${groupId}/expenses/new`);
    await pageA.fill('input[id="description"]', "Mountain Cabin Rental");
    await pageA.fill('input[id="amount-(eur)"]', "100.00");

    // Select SHARES split: User A has weight 3, User B has weight 2 (60.00 / 40.00)
    await pageA.click('button:has-text("shares")');

    // Enter weights
    const weightInputs = pageA.locator('input[placeholder="1"]');
    await weightInputs.nth(0).fill("3");
    await weightInputs.nth(1).fill("2");

    // Verify live preview shows balanced
    await expect(pageA.getByText("Balanced (€100.00)")).toBeVisible();

    // Submit expense
    await pageA.click('button[type="submit"]');
    await expect(pageA).toHaveURL(new RegExp(`.*groups/${groupId}`));
    await expect(pageA.getByText("Mountain Cabin Rental")).toBeVisible();

    // 5. Verify Balances for both users
    // User A paid 100, owes 60 -> User A is owed €40.00
    await pageA.click('button:has-text("balances")');
    await expect(pageA.getByText("Suggested Payments")).toBeVisible();
    await expect(pageA.getByText("pays", { exact: false })).toBeVisible();

    // User B checks balances
    await pageB.reload();
    await pageB.click('button:has-text("balances")');
    await expect(pageB.getByText("Suggested Payments")).toBeVisible();

    // 6. User B Settles Up with User A via the suggested payment action
    const suggestedPaymentSettleBtn = pageB
      .locator('div.divide-y button:has-text("Settle Up")')
      .first();
    await suggestedPaymentSettleBtn.click();

    // Settlement modal opens
    await expect(pageB.getByRole("heading", { name: "Record a Settlement" })).toBeVisible();
    await pageB.fill('input[type="number"]', "40.00");
    await pageB.click('button:has-text("Record Payment")');

    // 7. Verify both users are now settled up!
    await expect(
      pageB.getByText("Everyone in this group is fully settled up!")
    ).toBeVisible({ timeout: 10000 });

    await pageA.reload();
    await pageA.click('button:has-text("balances")');
    await expect(
      pageA.getByText("Everyone in this group is fully settled up!")
    ).toBeVisible({ timeout: 10000 });

    await contextA.close();
    await contextB.close();
  });
});
