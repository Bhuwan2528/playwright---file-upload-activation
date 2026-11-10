import type { Page } from "playwright";
import { PartnerLogin, PartnerLogout, failedUser } from "./partner-login.js";
import { AcceptStockInRequests } from "./stock-in-request-acceptance.js";
import { DesktopNotification } from "../../../utitls/desktop-notification.js";


export async function SaleIn(
    page: Page,
    zdCodes: string[],
    years: number[]
) {
    const password = process.env.PARTNER_PASSWORD;

    if (!password) {
        throw new Error("PARTNER_PASSWORD not found in .env!");
    }

    // Create a separate browser context for Partner Login
    const browser = page.context().browser();

    if (!browser) {
        throw new Error("Browser instance not found!");
    }

    const partnerContext = await browser.newContext();

    try {
        const partnerPage = await partnerContext.newPage();

        partnerPage.setDefaultTimeout(60000);
        partnerPage.setDefaultNavigationTimeout(120000);

        failedUser.length = 0;

        console.log("========================================");
        console.log("SALE-IN PROCESS STARTED");
        console.log("Total Partners:", zdCodes.length);
        console.log("Years:", years);
        console.log("========================================");

        // Process every partner
        for (const zdCode of zdCodes) {

            console.log(`\nProcessing Partner: ${zdCode}`);

            const loginSuccess = await PartnerLogin(
                partnerPage,
                zdCode,
                password
            );

            if (!loginSuccess) {
                continue;
            }

            try {
                await AcceptStockInRequests(partnerPage, years);
            } finally {
                // Logout after processing each partner
                await PartnerLogout(partnerPage);
            }
        }

    } finally {
        // Close only Partner browser context
        await partnerContext.close();
    }

    console.log("\n========================================");
    console.log("SALE-IN PROCESS COMPLETED");
    console.log("Total Partners:", zdCodes.length);
    console.log("Failed Logins:", failedUser.length);
    console.log("========================================");

    // Display all failed users
    if (failedUser.length > 0) {

        console.log("\n------------------------");
        console.log("FAILED USERS");
        console.log("------------------------");

        failedUser.forEach((user, index) => {
            console.log(`${index + 1}. Login ID: ${user.LoginId}`);
            console.log(`   Reason: ${user.reason}`);
            console.log("------------------------");
        });

        DesktopNotification(
            "🔺 Sale In Module Completed ",
            `${failedUser.length} partners failed to login , check Terminal`
        );

    } else {
        console.log("\n🎉 All partners processed successfully!");

        DesktopNotification(
            "⚡ Sale In Module Completed ",
            `Sale in module completed and all partners processed`
        );
    }

    return failedUser;
}