import type { Page } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { URLS } from "../../utitls/url.js";
import { GeneratedFileRename } from "../utility/generated-file-rename.js";
import { BrowserPopup } from "../../utitls/browser-popup.js";


const UPLOADED_BY_ID = "NTPL1007";
const POLL_INTERVAL = 60_000;
const MAX_WAIT_TIME = 5 * 60_000;
const MAX_ATTEMPTS = MAX_WAIT_TIME / POLL_INTERVAL + 1;

// Audit displays time only up to minutes, without seconds.
const EARLY_TIME_TOLERANCE = 59_000;
const LATE_TIME_TOLERANCE = 5 * 60_000;


function FormatAuditDate(value: string): Date | null {

    const match = value.trim().match(
        /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})$/
    );

    if (!match) return null;

    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const monthName = match[1];
    const dayText = match[2];
    const yearText = match[3];
    const hourText = match[4];
    const minuteText = match[5];

    if (
        !monthName ||
        !dayText ||
        !yearText ||
        !hourText ||
        !minuteText
    ) {
        return null;
    }

    const month = months.findIndex(
        item => item.toLowerCase() === monthName.toLowerCase()
    );

    const day = Number(dayText);
    const year = Number(yearText);
    const hours = Number(hourText);
    const minutes = Number(minuteText);

    if (
        month === -1 ||
        !Number.isInteger(day) ||
        !Number.isInteger(year) ||
        !Number.isInteger(hours) ||
        !Number.isInteger(minutes) ||
        day < 1 ||
        day > 31 ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {
        return null;
    }

    const auditDate = new Date(year, month, day, hours, minutes);

    // Prevent invalid dates such as 31 February.
    if (
        auditDate.getFullYear() !== year ||
        auditDate.getMonth() !== month ||
        auditDate.getDate() !== day
    ) {
        return null;
    }

    return auditDate;
}


export async function ActivationAuditRecovery(
    page: Page,
    filePath: string,
    uploadStartedAt: Date
): Promise<boolean> {

    const fileName = path.basename(filePath);
    const originalPageUrl = page.url();

    if (
        !(uploadStartedAt instanceof Date) ||
        Number.isNaN(uploadStartedAt.getTime())
    ) {
        throw new Error("Invalid Activation Upload Date!");
    }

    const tableBody = page.locator("tbody.data--body");
    const rows = tableBody.locator("tr");

    console.log("----------------------------------------");
    console.log("ACTIVATION AUDIT RECOVERY STARTED");
    console.log("File:", fileName);
    console.log("Uploaded By:", UPLOADED_BY_ID);
    console.log("Maximum Wait Time: 5 Minutes");
    console.log("----------------------------------------");

    // Open Import Audit page
    await page.goto(URLS.IMPORT_AUDIT_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    // Start the 5-minute polling window after opening Audit.
    const recoveryStartedAt = Date.now();

    // Check immediately, then refresh every minute.
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

        if (attempt > 1) {

            const nextCheckAt =
                recoveryStartedAt + (attempt - 1) * POLL_INTERVAL;

            const remainingWait = nextCheckAt - Date.now();

            if (remainingWait > 0) {
                await page.waitForTimeout(remainingWait);
            }

            console.log(`\nRefreshing Audit Page: ${attempt}/${MAX_ATTEMPTS}`);

            try {
                await page.reload({
                    waitUntil: "domcontentloaded",
                    timeout: 60000
                });

            } catch (error) {
                const reason = error instanceof Error
                    ? error.message
                    : String(error);

                console.log("⚠ Audit refresh failed:", reason);

                continue;
            }
        }

        console.log(`Audit Check: ${attempt}/${MAX_ATTEMPTS}`);

        // Wait for Audit table
        let tableReady = true;

        try {
            await tableBody.waitFor({
                state: "visible",
                timeout: 20000
            });

        } catch {
            tableReady = false;

            console.log("⚠ Audit table is not visible yet.");
        }

        let matchedRowIndex = -1;
        let closestTimeDifference = Infinity;

        if (tableReady) {

            const totalRows = await rows.count();

            // Search all currently displayed Audit rows
            for (let i = 0; i < totalRows; i++) {

                const row = rows.nth(i);
                const cells = row.locator("td");

                // Expected structure contains 10 columns.
                if (await cells.count() < 10) {
                    continue;
                }

                const uploadedFileName =
                    (await cells.nth(2).innerText()).trim();

                const uploadedBy =
                    (await cells.nth(4).innerText()).trim();

                const uploadedOn =
                    (await cells.nth(5).innerText()).trim();

                // Match exact filename and uploader ID
                if (
                    uploadedFileName.toLowerCase() !== fileName.toLowerCase() ||
                    !uploadedBy.includes(UPLOADED_BY_ID)
                ) {
                    continue;
                }

                const auditDate = FormatAuditDate(uploadedOn);

                if (!auditDate) {
                    continue;
                }

                // Match Audit timestamp with actual upload time.
                // Small negative difference is allowed because seconds
                // are not displayed on the Audit page.
                const timeDifference =
                    auditDate.getTime() - uploadStartedAt.getTime();

                if (
                    timeDifference < -EARLY_TIME_TOLERANCE ||
                    timeDifference > LATE_TIME_TOLERANCE
                ) {
                    continue;
                }

                const absoluteDifference = Math.abs(timeDifference);

                // If multiple rows match, choose the closest timestamp.
                if (absoluteDifference < closestTimeDifference) {

                    closestTimeDifference = absoluteDifference;
                    matchedRowIndex = i;
                }
            }
        }

        // Matching record found
        if (matchedRowIndex !== -1) {

            console.log("\n✅ Matching Activation Record Found!");

            const matchedRow = rows.nth(matchedRowIndex);
            const cells = matchedRow.locator("td");

            const failedText = (await cells.nth(8).innerText())
                .replace(/[,\s]/g, "")
                .trim();

            // Validate Failed Count
            if (!/^\d+$/.test(failedText)) {
                throw new Error(
                    `Invalid Failed Count in Audit: ${failedText}`
                );
            }

            const failedCount = Number(failedText);

            if (!Number.isSafeInteger(failedCount)) {
                throw new Error(
                    `Failed Count is outside the valid range: ${failedText}`
                );
            }

            console.log("Filename:", fileName);
            console.log("Uploaded By:", UPLOADED_BY_ID);
            console.log("Audit Time Difference:", Math.round(
                closestTimeDifference / 1000
            ), "seconds");
            console.log("Failed Records:", failedCount);

            // All records successfully processed
            if (failedCount === 0) {

                console.log("🎉 Audit confirms successful activation!");

                BrowserPopup(
                    page,
                    '✅Activation Succesfully Completed',
                    ''
                )


                // Return to the original Activation upload page.
                await page.goto(originalPageUrl, {
                    waitUntil: "domcontentloaded",
                    timeout: 60000
                });

                return false;
            }

            // Failed records found
            const downloadBtn = matchedRow.locator(
                'a[title="Download Failed Records"]'
            );

            await downloadBtn.waitFor({
                state: "visible",
                timeout: 30000
            });

            console.log("Downloading failed activation records...");
            BrowserPopup(
                page,
                '❌ Some activation Records Failed',
                ''
            )

            // Listen for download before clicking.
            const downloadPromise = page.waitForEvent("download", {
                timeout: 120000
            });

            await downloadBtn.click({
                timeout: 30000
            });

            const download = await downloadPromise;

            // Check download failure
            const downloadError = await download.failure();

            if (downloadError) {
                throw new Error(
                    `Failed Records Download Error: ${downloadError}`
                );
            }

            // Save failed report in existing folder
            const downloadFolder = path.join(
                process.cwd(),
                "data",
                "activation",
                "activation-failed-reports"
            );

            fs.mkdirSync(downloadFolder, {
                recursive: true
            });

            const originalFileName = path.parse(fileName).name;

            const outputFileName = GeneratedFileRename(
                originalFileName,
                "failed-activation"
            );

            const outputPath = path.join(
                downloadFolder,
                outputFileName
            );

            await download.saveAs(outputPath);

            if (
                !fs.existsSync(outputPath) ||
                fs.statSync(outputPath).size === 0
            ) {
                throw new Error(
                    `Failed Activation Report was not saved correctly: ${outputPath}`
                );
            }

            console.log("----------------------------------------");
            console.log("✅ FAILED ACTIVATION REPORT DOWNLOADED");
            console.log("Failed Records:", failedCount);
            console.log("Saved At:", outputPath);
            console.log("----------------------------------------");

            // Return to original Activation upload page.
            await page.goto(originalPageUrl, {
                waitUntil: "domcontentloaded",
                timeout: 60000
            });

            return true;
        }

        console.log("⚠ Matching Audit record not found yet.");

        if (attempt < MAX_ATTEMPTS) {
            console.log("Next Audit check will run after 1 minute.");
        }
    }

    // No matching record after all six checks.

    BrowserPopup(
        page,
        `Activation Audit record not found after 5 minutes: ${fileName}`,
        '',
        "red"
    )

    throw new Error(
        `Activation Audit record not found after 5 minutes: ${fileName}`
    );
}