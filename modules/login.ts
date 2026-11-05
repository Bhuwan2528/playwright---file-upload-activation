import type { Page } from "playwright";
import { URLS } from "../utitls/url.js";
import 'dotenv/config';

export async function Login(page: Page) {

    await page.goto(URLS.LOGIN)

    // Automatically fill Login ID and Password
    const loginId = page.getByRole('textbox', { name: 'Enter Login Id' });
    await loginId.fill(process.env.LOGIN_ID!);

    const password = page.getByRole('textbox', { name: 'Enter Password' });
    await password.fill(process.env.LOGIN_PASSWORD!);

    const authCode = page.getByRole('textbox', { name: 'Enter AuthCode' });
    await authCode.click()

    console.log('========== Enter Auth Code ==========');
    console.log('--------------------------------')

    await page.waitForURL(
        URLS.HOME,
        {
            timeout: 0,
            waitUntil: "domcontentloaded"
        }
    )
}