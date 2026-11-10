import type { Page } from "playwright";
import { PartnerLogin, PartnerLogout, failedUser } from "./partner-login.js";
import { AcceptStockInRequests } from "./stock-in-request-acceptance.js";
import { BrowserPopup } from "../../../utitls/browser-popup.js";


export async function SaleIn(
    page: Page,
    zdCodes: string[],
    years: number[]
) {
    const password = process.env.PARTNER_PASSWORD;

    if (!password) {
        throw new Error("PARTNER_PASSWORD not found in .env!");
    }

    if (zdCodes.length === 0) {
        throw new Error("No ZD Codes found for Sale-In!");
    }

    // Create a separate browser context for Partner Login
    const browser = page.context().browser();

    if (!browser) {
        throw new Error("Browser instance not found!");
    }

    const partnerContext = await browser.newContext();

    failedUser.length = 0;

    const failedProcessing: { LoginId: string; reason: string }[] = [];

    try {

        const partnerPage = await partnerContext.newPage();

        partnerPage.setDefaultTimeout(60000);
        partnerPage.setDefaultNavigationTimeout(120000);

        console.log("========================================");
        console.log("SALE-IN PROCESS STARTED");
        console.log("Total Partners:", zdCodes.length);
        console.log("Partner IDs:", zdCodes);
        console.log("Years:", years);
        console.log("========================================");

        // Process every partner
        for (const zdCode of zdCodes) {

            console.log("\n========================================");
            console.log("PROCESSING PARTNER:", zdCode);
            console.log("========================================");

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

            } catch (error) {

                const reason = error instanceof Error
                    ? error.message
                    : String(error);

                console.log(`⚠ Sale-In Processing Failed: ${zdCode}`);
                console.log("REASON:", reason);

                failedProcessing.push({
                    LoginId: zdCode,
                    reason
                });

            } finally {

                // Logout after processing each partner
                await PartnerLogout(partnerPage);

                console.log(`✅ Partner Logout: ${zdCode}`);
            }
        }

    } finally {

        // Close only Partner browser context
        await partnerContext.close();

        console.log("Partner Browser Context Closed.");
    }


    // Sale-In Summary
    console.log("\n========================================");
    console.log("SALE-IN PROCESS COMPLETED");
    console.log("Total Partners:", zdCodes.length);
    console.log("Failed Logins:", failedUser.length);
    console.log("Failed Processing:", failedProcessing.length);
    console.log("========================================");


    // Display Failed Users
    if (failedUser.length > 0 || failedProcessing.length > 0) {

        if (failedUser.length > 0) {

            console.log("\n------------------------");
            console.log("FAILED LOGINS");
            console.log("------------------------");

            failedUser.forEach((user, index) => {
                console.log(`${index + 1}. Login ID: ${user.LoginId}`);
                console.log(`   Reason: ${user.reason}`);
                console.log("------------------------");
            });
        }

        if (failedProcessing.length > 0) {

            console.log("\n------------------------");
            console.log("FAILED PROCESSING");
            console.log("------------------------");

            failedProcessing.forEach((user, index) => {
                console.log(`${index + 1}. Login ID: ${user.LoginId}`);
                console.log(`   Reason: ${user.reason}`);
                console.log("------------------------");
            });
        }

        BrowserPopup(
            page,
            "🔺 Sale-In Module Completed",
            `Login Failures: ${failedUser.length}, Processing Failures: ${failedProcessing.length}. Check Terminal.`
        );

    } else {

        console.log("\n🎉 All Partners Processed Successfully!");

        BrowserPopup(
            page,
            "⚡ Sale-In Module Completed"
        );
    }

    return failedUser;
}