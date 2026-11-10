
import type { Page } from "playwright";
import { URLS } from "../../utitls/url.js";
import path from "node:path";
import fs from "node:fs";
import { GeneratedFileRename } from "../utility/generated-file-rename.js";
import { BrowserPopup } from "../../utitls/browser-popup.js";

export async function FinanceFileUpload(page: Page) {

    await page.goto(URLS.FINANCE_UPLOAD_URL);

    const dataFolder = path.join(process.cwd(), 'data');
    const financeFolder = path.join(dataFolder, 'finance');
    const financeDataFolder = path.join(financeFolder, 'finance-data');

    const files = fs.readdirSync(financeDataFolder).filter(file =>
        !file.startsWith('~$') &&
        (file.endsWith('.xlsx') || file.endsWith('.csv'))
    );

    console.log('Total Files Found:', files.length);

    const file = files[0];

    if (!file) {
        throw new Error('Finance file not found!');
    }

    const filePath = path.join(financeDataFolder, file);

    // Wait for previous toast to disappear
    const toast = page.locator('[role="alert"].toast-message');

    await toast.first().waitFor({
        state: "hidden",
        timeout: 120000
    });

    // Select file
    const selection = page.locator('input[type="file"]');
    await selection.setInputFiles(filePath);

    console.log(`Uploading ${file}...`);

    // Click Upload
    const uploadBtn = page.getByRole('button', {
        name: 'Upload',
        exact: true
    });

    await uploadBtn.click();

    // Wait for toast messages
    await toast.first().waitFor({
        state: "visible",
        timeout: 300000
    });

    const message = (await toast.allTextContents()).join(' ').toLowerCase();

    console.log(message);

    const failedCountMatch = message.match(
        /(\d[\d,]*)\s*records?\s*(?:failed|fail)/i
    );

    const failedCount = failedCountMatch
        ? Number(failedCountMatch[1]?.replace(/,/g, ""))
        : null;

    // Download failed report
    if (message.includes('failed')) {

        const downloadBtn = page.locator('button.btn.btn-title')
            .filter({ hasText: 'Download' });

        await downloadBtn.waitFor({
            state: "visible",
            timeout: 120000
        });

        const downloadPromise = page.waitForEvent('download');
        await downloadBtn.click();

        const download = await downloadPromise;

        const downloadFolder = path.join(financeFolder, 'finance-failed-reports');

        fs.mkdirSync(downloadFolder, { recursive: true });

        const originalFileName = path.parse(file).name;
        const fileName = GeneratedFileRename(originalFileName, 'failed-finance');

        await download.saveAs(path.join(downloadFolder, fileName));

        console.log(`👇🏻 ${fileName} downloaded`);

        BrowserPopup(
            page,
            `❌ ${failedCount} Finance File records failed` ,
        );

    } else if (message.includes('successfully')) {
        console.log(`🎉 ${file} uploaded successfully`);


        BrowserPopup(
            page,
            "✅ Finance File Completed ",
        );
    }

    await page.waitForTimeout(5000)
}
