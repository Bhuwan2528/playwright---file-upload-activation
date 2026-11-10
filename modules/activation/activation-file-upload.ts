import type { Page } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { URLS } from "../../utitls/url.js";
import { GeneratedFileRename } from "../utility/generated-file-rename.js";
import { ActivationAuditRecovery } from "./activation-audit-recovery.js";
import { BrowserPopup } from "../../utitls/browser-popup.js";

export async function ActivationFileUpload(
    page: Page,
    filePath: string
): Promise<boolean> {

    await page.goto(URLS.ACTIVATIONS_UPLOAD_URL);

    const activationFolder = path.join(process.cwd(), "data", "activation");
    const file = path.basename(filePath);

    let is_activation_failed = false;

    // Angular Toast
    const toast = page.locator('[role="alert"].toast-message');

    await toast.waitFor({
        state: "hidden",
        timeout: 120000
    });

    // Select File
    const selection = page.locator('input[type="file"]');

    await selection.waitFor({ state: "visible" });
    await selection.setInputFiles(filePath);

    console.log(`Uploading ${file}...`);

    // Click Upload
    const uploadBtn = page.getByRole("button", {
        name: "Upload",
        exact: true
    });

    await uploadBtn.waitFor({ state: "visible" });

    // Capture upload date and time
    const uploadStartedAt = new Date();

    await uploadBtn.click();

    await toast.waitFor({
        state: "visible",
        timeout: 300000
    });

    const message = await toast.innerText();
    // const message = 'unexpected error occured';
    console.log(message);

    const failedCountMatch = message.match(
        /(\d[\d,]*)\s*records?\s*(?:failed|fail)/i
    );

    const failedCount = failedCountMatch
        ? Number(failedCountMatch[1]?.replace(/,/g, ""))
        : null;

    

    // Unexpected Error - Check Import Audit
    if (message.toLowerCase().includes("unexpected error")) {

        console.log("⚠ Unexpected Error Detected!");
        console.log("Checking Import File Audit...");

        is_activation_failed = await ActivationAuditRecovery(
            page,
            filePath,
            uploadStartedAt
        );

    }

    // Normal Failed File Download
    else if (message.toLowerCase().includes("failed")) {

        is_activation_failed = true;

        const downloadBtn = page.locator("button.btn.btn-title")
            .filter({ hasText: "Download" });

        await downloadBtn.waitFor({
            state: "visible",
            timeout: 120000
        });

        const downloadPromise = page.waitForEvent("download");

        await downloadBtn.click();

        const download = await downloadPromise;

        const downloadFolder = path.join(
            activationFolder,
            "activation-failed-reports"
        );

        fs.mkdirSync(downloadFolder, { recursive: true });

        const originalFileName = path.parse(file).name;

        const fileName = GeneratedFileRename(
            originalFileName,
            "failed-activation"
        );

        await download.saveAs(
            path.join(downloadFolder, fileName)
        );

        console.log(`👇🏻 ${fileName} downloaded`);

        BrowserPopup(
            page,
            `❌ ${failedCount} activation Records Failed`,
            ''
        )


    }

    else if (message.toLowerCase().includes("successfully")) {

        BrowserPopup(
            page,
            '✅ Activation Completed'
        )
        console.log(`🎉 ${file} uploaded successfully`);
    }

    await page.waitForTimeout(5000);

    return is_activation_failed;
}