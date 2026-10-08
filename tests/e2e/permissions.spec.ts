import { test, expect } from "@playwright/test";

test.describe("Security & Permissions Isolation", () => {
  const timestamp = Date.now();
  const ownerUser = {
    name: "Group Owner",
    email: `owner_${timestamp}@example.com`,
    password: "password123",
  };
  const outsiderUser = {
    name: "Outsider User",
    email: `outsider_${timestamp}@example.com`,
    password: "password123",
  };

  test("non-member cannot access private group page or API", async ({ browser }) => {
    // 1. Owner registers and creates a private group
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();

    await ownerPage.goto("/register");
    await ownerPage.fill('input[id="full-name"]', ownerUser.name);
    await ownerPage.fill('input[id="email"]', ownerUser.email);
    await ownerPage.fill('input[id="password"]', ownerUser.password);
    await ownerPage.click('button[type="submit"]');

    await expect(ownerPage).toHaveURL(/.*dashboard/);

    await ownerPage.click('text="Create Group"');
    await ownerPage.fill('input[id="group-name"]', "Secret Private Club");
    await ownerPage.selectOption('select[id="currency-selector"]', "USD");
    await ownerPage.click('button[type="submit"]');

    // Wait until redirected to the newly created group (not /groups/new)
    await expect(ownerPage).toHaveURL(/\/groups\/(?!new)[a-zA-Z0-9_-]+/);
    const privateGroupId = ownerPage.url().split("/groups/")[1];

    // 2. Outsider registers
    const outsiderContext = await browser.newContext();
    const outsiderPage = await outsiderContext.newPage();

    await outsiderPage.goto("/register");
    await outsiderPage.fill('input[id="full-name"]', outsiderUser.name);
    await outsiderPage.fill('input[id="email"]', outsiderUser.email);
    await outsiderPage.fill('input[id="password"]', outsiderUser.password);
    await outsiderPage.click('button[type="submit"]');

    await expect(outsiderPage).toHaveURL(/.*dashboard/);

    // 3. Outsider directly navigates to private group URL
    await outsiderPage.goto(`/groups/${privateGroupId}`);

    // Expect to be blocked and redirected to dashboard
    await expect(outsiderPage).toHaveURL(/.*dashboard/);

    // 4. Test API level rejection: fetch API directly from outsider page context
    const apiResponse = await outsiderPage.evaluate(async (gid) => {
      const res = await fetch(`/api/groups/${gid}`);
      return { status: res.status, body: await res.json() };
    }, privateGroupId);

    expect(apiResponse.status).toBe(403);
    expect(apiResponse.body.error).toContain("Access denied");

    // 5. Test Expense Creation rejection by non-member
    const expenseResponse = await outsiderPage.evaluate(async (gid) => {
      const res = await fetch(`/api/groups/${gid}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Illegal Expense",
          amountCents: 5000,
          date: new Date().toISOString(),
          category: "Food",
          paidById: "fake-id",
          splitType: "EQUAL",
          shares: [{ userId: "fake-id", amountCents: 5000 }],
        }),
      });
      return res.status;
    }, privateGroupId);

    expect(expenseResponse).toBe(403);

    await ownerContext.close();
    await outsiderContext.close();
  });
});
