import playwright from "playwright";
import type { Page } from "playwright";
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

import { ActivationFileUpload } from "./modules/activation/activation-file-upload.js";
import { ActivationFileCreation } from "./modules/activation/activation-file-creation.js";
import {
    RegisterFileOpenFunction,
    ShowFileReviewModal
} from "./modules/utility/file-review-modal.js";

import { FinanceFileCreation } from "./modules/finance/finance-file-creation.js";
import { FinanceFileUpload } from "./modules/finance/finance-file-upload.js";

import { Login } from "./modules/login/login.js";
import { FailedActivationRawFileCreation } from "./modules/failed-activation/failed-activation-raw-file.js";

import { StockImportFileCreation } from "./modules/failed-activation/stock-import/stock-import-file-creation.js";
import { StockImportFileUpload } from "./modules/failed-activation/stock-import/stock-import-file-upload.js";

import { UploadPrimaryFileCreation } from "./modules/failed-activation/upload-primary/upload-primary-file-creation.js";
import { UploadPrimaryFileUpload } from "./modules/failed-activation/upload-primary/upload-primary-file-upload.js";

import { SaleIn } from "./modules/failed-activation/sale-in/sale-in.js";

import { BackupGeneratedFiles } from "./utitls/backup-files.js";
import { CleanupGeneratedFiles } from "./utitls/cleanup-files.js";
import { DesktopNotification } from "./utitls/desktop-notification.js";
import { BrowserPopup } from "./utitls/browser-popup.js";


// Select Original Activation Raw File
function GetOriginalActivationRawFile(): string {

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

    return path.join(rawFolder, rawFile);
}


// Failed Activation Process
async function FailedActivationProcess(page: Page): Promise<void> {

    console.log("\n========================================");
    console.log("FAILED ACTIVATION PROCESS STARTED");
    console.log("========================================");

    // Create Filtered Failed Activation Raw File
    const failedActivationRawFilePath =
        await FailedActivationRawFileCreation();


    // Stock Import
    await StockImportFileCreation(page);
    await StockImportFileUpload(page);


    // Upload Primary
    const uploadPrimaryResult = await UploadPrimaryFileCreation(page);
    await UploadPrimaryFileUpload(page);

    console.log("ZD Codes Received:", uploadPrimaryResult.zdCodes);
    console.log("Total Partners:", uploadPrimaryResult.zdCodes.length);

    // Sale-In
    await SaleIn(
        page,
        uploadPrimaryResult.zdCodes,
        uploadPrimaryResult.years
    );


    // Retry Activation using Filtered Raw File
    const activationOutputPath = await ActivationFileCreation(
        failedActivationRawFilePath
    );

    await ShowFileReviewModal(page, activationOutputPath, "Activation from FANR file created");

    const is_activation_failed = await ActivationFileUpload(
        page,
        activationOutputPath
    );

    if (is_activation_failed) {
        console.log("⚠ Some records are still failing after Activation Retry.");
    }
}


// Finance Process
async function FinanceProcess(page: Page): Promise<void> {

    console.log("\n========================================");
    console.log("FINANCE PROCESS STARTED");
    console.log("========================================");

    const financeOutputPath = await FinanceFileCreation(page);
    await FinanceFileUpload(page);
}


// Backup and Cleanup
async function BackupAndCleanup(page: Page): Promise<void> {

    console.log("\n========================================");
    console.log("BACKUP AND CLEANUP STARTED");
    console.log("========================================");

    const backedUpFiles = await BackupGeneratedFiles();

    await CleanupGeneratedFiles(backedUpFiles, page);
}


// Main Automation
async function main() {

    let browser: playwright.Browser | undefined;

    try {

        browser = await playwright.chromium.launch({
            headless: false
        });

        const page = await browser.newPage();

        await RegisterFileOpenFunction(page);

        // Login
        await Login(page);


        // Initial Activation
        const rawFilePath = GetOriginalActivationRawFile();
        const activationOutputPath = await ActivationFileCreation(rawFilePath);
        await ShowFileReviewModal(page, activationOutputPath, "Activation file created!");

        const is_activation_failed = await ActivationFileUpload(
            page,
            activationOutputPath
        );


        // Failed Activation Process
        if (is_activation_failed) {
            await FailedActivationProcess(page);
        } else {
            console.log("\n✅ No Failed Activations Found!");
            console.log("Skipping Failed Activation Process...");

            BrowserPopup(
                page,
                "✅ No Failed Activations Found!",
                "Skipping Failed Activation Process..."
            )
        }


        // Finance Process
        await FinanceProcess(page);

        // Backup and Cleanup
        await BackupAndCleanup(page);


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