import playwright from "playwright";
import { ActivationFileUpload } from "./modules/activation/activation-file-upload.js";
import { ActivationFileCreation } from "./modules/activation/activation-file-creation.js";
import {
    RegisterFileOpenFunction,
    ShowFileReviewModal
} from "./modules/utility/file-review-modal.js";
import { FinanceFileCreation } from "./modules/finance/finance-file-creation.js";
import { FinanceFileUpload } from "./modules/finance/finance-file-upload.js";
import { DesktopNotification } from "./utitls/desktop-notification.js";
import { Login } from "./modules/login/login.js";
import { FailedActivationRawFileCreation } from "./modules/failed-activation/failed-activation-raw-file.js";
import { BackupGeneratedFiles } from "./utitls/backup-files.js";
import { CleanupGeneratedFiles } from "./utitls/cleanup-files.js";
import { StockImportFileCreation } from "./modules/failed-activation/stock-import/stock-import-file-creation.js";
import { StockImportFileUpload } from "./modules/failed-activation/stock-import/stock-import-file-upload.js";
import { UploadPrimaryFileCreation } from "./modules/failed-activation/upload-primary/upload-primary-file-creation.js";
import { UploadPrimaryFileUpload } from "./modules/failed-activation/upload-primary/upload-primary-file-upload.js";

async function main() {

    let browser: playwright.Browser | undefined;

    try {

        browser = await playwright.chromium.launch({
            headless: false
        });

        const page = await browser.newPage();

        await RegisterFileOpenFunction(page);

        // Login and homepage waiting
        await Login(page);

        // Activation file module
        
        const activationOutputPath = await ActivationFileCreation();
        await ShowFileReviewModal(page, activationOutputPath);
        await ActivationFileUpload(page);

        
        const failedActivationRawFilePath = await FailedActivationRawFileCreation();
        
        const stockImportPath = await StockImportFileCreation()
        await ShowFileReviewModal(page, stockImportPath)
        await StockImportFileUpload(page)
        
        
        const uploadPrimaryPath = await UploadPrimaryFileCreation()
        await ShowFileReviewModal(page, uploadPrimaryPath)
        await UploadPrimaryFileUpload(page)


        // Finance file module
        
        // const financeOutputPath = await FinanceFileCreation(); 
        // await ShowFileReviewModal(page, financeOutputPath);
        // await FinanceFileUpload(page);

        //backup and cleanup

        const backedUpFiles = await BackupGeneratedFiles();
        await CleanupGeneratedFiles(backedUpFiles);

        console.log("========================================");
        console.log("🥳 AUTOMATION COMPLETE 🥳");
        console.log("========================================");

        DesktopNotification(
            "Full Automation Completed 🎉",
            "Activation and Finance files processed successfully!"
        );

    } catch (error) {

        const errorMessage = error instanceof Error
            ? error.message
            : String(error);

        console.error("----------------------------------------");
        console.error("❌ AUTOMATION FAILED");
        console.error("Error:", error);
        console.error("----------------------------------------");

        DesktopNotification(
            "Automation Failed ❌",
            errorMessage
        );

        process.exitCode = 1;

    } finally {

        // if (browser) {
        //     await browser.close();
        //     console.log("Browser closed successfully.");
        // }

    }
}

main();
