import playwright from "playwright";
import fs from "node:fs";
import path from "node:path";

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
import { SaleIn } from "./modules/failed-activation/sale-in/sale-in.js";
import "dotenv/config";


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


        // Select Original Raw Activation File
        const rawFolder = path.join(
            process.cwd(),
            "data",
            "activation",
            "activation-raw-data"
        );

        const rawFiles = fs.readdirSync(rawFolder).filter(file =>
            !file.startsWith("~$") &&
            file.toLowerCase().endsWith(".xlsx")
        );

        const rawFile = rawFiles[0];

        if (!rawFile) {
            throw new Error("Original Activation Raw File not found!");
        }

        const rawFilePath = path.join(rawFolder, rawFile);


        // Initial Activation Creation and Upload
        const activationOutputPath = await ActivationFileCreation(rawFilePath);
        await ShowFileReviewModal(page, activationOutputPath);
        const is_activation_failed = await ActivationFileUpload(
            page,
            activationOutputPath
        );


        // Failed Activation Process
        if (is_activation_failed) {

            console.log("\n========================================");
            console.log("FAILED ACTIVATION PROCESS STARTED");
            console.log("========================================");


            // Create Filtered Failed Activation Raw File
            const failedActivationRawFilePath = await FailedActivationRawFileCreation();


            // Stock Import
            const stockImportPath = await StockImportFileCreation();
            await ShowFileReviewModal(page, stockImportPath);
            await StockImportFileUpload(page);


            // Upload Primary
            const uploadPrimaryResult = await UploadPrimaryFileCreation();
            await ShowFileReviewModal(page, uploadPrimaryResult.outputPath);
            await UploadPrimaryFileUpload(page);


            // Sale-In
            await SaleIn(
                page,
                uploadPrimaryResult.zdCodes,
                uploadPrimaryResult.years
            );


            // Retry Activation using Filtered Raw File
            const activationOutputPath_1 = await ActivationFileCreation(
                failedActivationRawFilePath
            );

            await ShowFileReviewModal(page, activationOutputPath_1);

            const is_activation_failed_1 = await ActivationFileUpload(
                page,
                activationOutputPath_1
            );

        } else {

            console.log("\n✅ No Failed Activations Found!");
            console.log("Skipping Failed Activation Process...");

        }


        // Finance File Module
        const financeOutputPath = await FinanceFileCreation();
        await ShowFileReviewModal(page, financeOutputPath);
        await FinanceFileUpload(page);


        // Backup and Cleanup
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