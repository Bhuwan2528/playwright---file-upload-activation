import playwright from "playwright";
import { Login } from "./modules/login.js";
import { ActivationFileUpload } from "./modules/activation/activation-file-upload.js";
import { ActivationFileCreation } from "./modules/activation/activation-file-creation.js";
import { URLS } from "./utitls/url.js";
import {
    RegisterFileOpenFunction,
    ShowFileReviewModal
} from './modules/utility/file-review-modal.js';
import { FinanceFileCreation } from "./modules/finance/finance-file-creation.js";
import { FinanceFileUpload } from "./modules/finance/finance-file-upload.js";

async function main(){
    const browser = await playwright.chromium.launch({
        headless: false
    })

    const page = await browser.newPage()

    await RegisterFileOpenFunction(page);
    
    //login, homepage waiting
    await Login(page)

    // Activation file module

    const ActivationOutputPath = await ActivationFileCreation()
    await ShowFileReviewModal(page, ActivationOutputPath)
    await ActivationFileUpload(page)

    const financeOutputPath = await FinanceFileCreation()
    await ShowFileReviewModal(page, financeOutputPath)
    await FinanceFileUpload(page)

    console.log('========================================')
    console.log('========================================')
    console.log('🥳🥳🥳🥳 AUTOMATION COMPLETE🥳🥳🥳🥳')
    console.log('========================================')
    console.log('========================================') 
    
    await page.waitForTimeout(10000)
    await browser.close()
}

main()