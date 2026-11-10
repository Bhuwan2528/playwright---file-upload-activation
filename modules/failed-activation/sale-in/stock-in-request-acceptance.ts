
import type { Page } from "playwright";
import { URLS } from "../../../utitls/url.js";

export async function AcceptStockInRequests(
    page: Page,
    years: number[]
) {

    await page.goto(URLS.SALE_IN_REQUESTS);

    await page.waitForTimeout(1000);

    // Change Monthly filter to Yearly
    const periodDropdown = page.getByRole('combobox', {
        name: 'Monthly'
    }).locator('svg');

    await periodDropdown.click();

    const yearlyOption = page.getByRole('option', {
        name: 'Yearly',
        exact: true
    });

    await yearlyOption.waitFor({
        state: 'visible'
    });

    await yearlyOption.click();

    await page.waitForTimeout(1000);

    // Process every year
    for (let index = 0; index < years.length; index++) {

        const year = years[index]!;

        // Change year after first iteration
        if (index > 0) {

            const previousYear = years[index - 1]!;

            const yearDropdown = page.getByRole('combobox', {
                name: String(previousYear)
            }).locator('svg');

            await yearDropdown.click();

            const yearOption = page.getByRole('option', {
                name: String(year),
                exact: true
            });

            await yearOption.waitFor({
                state: 'visible'
            });

            await yearOption.click();

            await page.waitForTimeout(1000);
        }

        console.log(`Processing Year: ${year}`);

        const dots = page.locator('button.mat-mdc-menu-trigger.btn');

        // Accept all requests for selected year
        while (true) {

            const firstDot = dots.first();

            try {

                await firstDot.waitFor({
                    state: 'visible',
                    timeout: 2000
                });

            } catch {

                console.log(`${year} ki saari requests process ho gayi.`);
                break;
            }

            await firstDot.click();

            const confirmMenu = page.getByRole('menuitem', {
                name: ' Confirm'
            });

            await confirmMenu.waitFor({
                state: 'visible'
            });

            await confirmMenu.click();

            const confirmBtn = page.getByRole('button', {
                name: 'Confirm',
                exact: true
            });

            await confirmBtn.waitFor({
                state: 'visible'
            });

            await confirmBtn.click();

            const spinner = page.locator('.ngx-spinner-overlay');

            await spinner.waitFor({
                state: 'hidden',
                timeout: 15000
            });

            await page.waitForTimeout(2000);
        }
    }

    console.log('✔ All Stock-In Requests Processed');
}
