import type { Page } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { URLS } from "../../utitls/url.js";
import { GeneratedFileRename } from "../utility/generated-file-rename.js";
import { DesktopNotification } from "../../utitls/desktop-notification.js";

export async function ActivationFileUpload(
    page: Page,
    filePath: string
): Promise<boolean> {

    await page.goto(URLS.ACTIVATIONS_UPLOAD_URL);

    const dataFolder = path.join(process.cwd(), "data");
    const activationFolder = path.join(dataFolder, "activation");

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
    await uploadBtn.click();

    await toast.waitFor({
        state: "visible",
        timeout: 300000
    });

    const message = await toast.innerText();

    console.log(message);

    // Failed File Download
    if (message.toLowerCase().includes("failed")) {

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

        console.log(`👇🏻 ${file} downloaded`);

    } else if (message.toLowerCase().includes("successfully")) {

        console.log(`🎉 ${file} uploaded successfully`);
    }

    DesktopNotification(
        "⚡ Activation Module Completed ",
        "Activation file creation & uploading completed!"
    );

    await page.waitForTimeout(5000);

    return is_activation_failed;
}