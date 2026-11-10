import type { Page } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { URLS } from "../../../utitls/url.js";
import { DesktopNotification } from "../../../utitls/desktop-notification.js";

export async function StockImportFileUpload(page: Page) {

    await page.goto(URLS.STOCK_IMPORT_URL);

    const dataFolder = path.join(process.cwd(), 'data');
    const failedActivationFolder = path.join(dataFolder, 'failed-activation');
    const stockImportFolder = path.join(failedActivationFolder, 'stock-import');

    // Find Stock Import Excel file
    const files = fs.readdirSync(stockImportFolder).filter(file =>
        !file.startsWith('~$') &&
        (file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.csv'))
    );

    console.log('Total Files Found:', files.length);

    const file = files[0];

    if (!file) {
        throw new Error('Stock Import file not found!');
    }

    const filePath = path.join(stockImportFolder, file);

    // Wait for previous toast to disappear
    const toast = page.locator('[role="alert"].toast-message');

    await toast.first().waitFor({
        state: "hidden",
        timeout: 120000
    });

    // Select file
    const selection = page.locator('input[type="file"]');
    await selection.setInputFiles(filePath);

    console.log(`Uploading Stock Import: ${file}...`);

    // Click Upload
    const uploadBtn = page.getByRole('button', {
        name: 'Upload',
        exact: true
    });

    await uploadBtn.click();

    // Wait for toast message
    await toast.first().waitFor({
        state: "visible",
        timeout: 300000
    });

    const message = (await toast.allTextContents()).join(' ');

    console.log(message);

    if (message.toLowerCase().includes('successfully')) {
        console.log(`🎉 ${file} Stock Import uploaded successfully`);
    }

    // Desktop notification
    DesktopNotification(
        "⚡ Stock Import Completed ",
        "Stock Import file created and uploaded successfully!"
    );

    await page.waitForTimeout(5000);
}
