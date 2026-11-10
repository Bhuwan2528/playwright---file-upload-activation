
import type { Page } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { URLS } from "../../../utitls/url.js";
import { DesktopNotification } from "../../../utitls/desktop-notification.js";

export async function UploadPrimaryFileUpload(page: Page) {

    await page.goto(URLS.UPLOAD_PRIMARY_URL);

    const dataFolder = path.join(process.cwd(), 'data');
    const failedActivationFolder = path.join(dataFolder, 'failed-activation');
    const uploadPrimaryFolder = path.join(failedActivationFolder, 'upload-primary');

    // Find Upload Primary Excel file
    const files = fs.readdirSync(uploadPrimaryFolder).filter(file =>
        !file.startsWith('~$') &&
        (file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.csv'))
    );

    console.log('Total Files Found:', files.length);

    const file = files[0];

    if (!file) {
        throw new Error('Upload Primary file not found!');
    }

    const filePath = path.join(uploadPrimaryFolder, file);

    // Wait for previous toast to disappear
    const toast = page.locator('[role="alert"].toast-message');

    await toast.first().waitFor({
        state: "hidden",
        timeout: 120000
    });

    // Select file
    const selection = page.locator('input[type="file"]');
    await selection.setInputFiles(filePath);

    console.log(`Uploading Primary File: ${file}...`);

    // Click Upload
    const uploadBtn = page.getByRole('button', { name: ' Confirm Upload' })

    await uploadBtn.click();

    // Wait for toast messages
    await toast.first().waitFor({
        state: "visible",
        timeout: 300000
    });

    const message = (await toast.allTextContents()).join(' ').toLowerCase();

    console.log(message);

    if (message.includes('successfully')) {

        console.log(`🎉 ${file} uploaded successfully`);

        DesktopNotification(
            "⚡ Upload Primary Module Completed ",
            `Upload Primary files creation & uploading completed!`
        );
    } else if (message.includes('failed')) {

        console.log(`❌ Upload completed with failed records: ${message}`);

        DesktopNotification(
            "🔺 Upload Primary Module Completed ",
            ` Upload completed with failed records: ${message}`
        );
    }

    await page.waitForTimeout(5000);
}
