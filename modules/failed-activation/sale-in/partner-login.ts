import type { Page } from "playwright";
import { URLS } from "../../../utitls/url.js";

export interface FailedUserData {
    LoginId: string;
    Password: string;
    reason: string;
}

export const failedUser: FailedUserData[] = [];

export async function PartnerLogin(
    page: Page,
    loginId: string,
    password: string
): Promise<boolean> {

    try {
        await page.goto(URLS.PARTNER_LOGIN, {
            waitUntil: "domcontentloaded",
            timeout: 120000
        });

        const idBox = page.getByRole("textbox", { name: "Enter Login Id" });
        const passwordBox = page.getByRole("textbox", { name: "Enter Password" });
        const submitBtn = page.getByRole("button", { name: "Sign In" });

        await idBox.fill(String(loginId));
        await passwordBox.fill(String(password));
        await submitBtn.click();

        const errorPopup = page.getByRole("alert");

        const result = await Promise.race([

            page.waitForURL(URLS.PARTNER_HOME, {
                timeout: 120000
            }).then(() => "success"),

            errorPopup.waitFor({
                state: "visible",
                timeout: 120000
            }).then(() => "failed")

        ]);

        if (result === "success") {
            console.log("✅ Login Successful:", loginId);
            return true;
        }

        if (result === "failed") {
            const reason = await errorPopup.innerText();

            console.log("❌ Failed:", loginId);
            console.log("REASON:", reason);

            failedUser.push({
                LoginId: loginId,
                Password: password,
                reason
            });

            await page.waitForTimeout(2000);

            return false;
        }

        return false;

    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);

        console.log("⚠ Unexpected Error:", loginId);

        failedUser.push({
            LoginId: loginId,
            Password: password,
            reason
        });

        return false;
    }
}


export async function PartnerLogout(page: Page) {

    const userMenu = page.locator("div.user--btn");
    await userMenu.waitFor({ state: 'visible' })
    await userMenu.click();

    const logoutBtn = page.getByRole('listitem').filter({ hasText: 'Logout' })
    await logoutBtn.waitFor({ state: 'visible' })
    await logoutBtn.click()
}