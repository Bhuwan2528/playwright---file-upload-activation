import type { Page } from "playwright";
import path from 'node:path'
import fs from 'node:fs'
import { URLS } from "../../utitls/url.js";
import { GeneratedFileRename } from "../utility/generated-file-rename.js";
import { DesktopNotification } from "../../utitls/desktop-notification.js";

export async function ActivationFileUpload(page: Page){

    await page.goto(URLS.ACTIVATIONS_UPLOAD_URL)

    const dataFolder = path.join(process.cwd(), 'data')
    const activationFolder = path.join(dataFolder, 'activation')
    const activationDataFolder = path.join(activationFolder, 'activation-data')

    const files = fs.readdirSync(activationDataFolder)
    .filter( file => 
        !file.startsWith('~$') &&
        file.endsWith('.xlsx') || file.endsWith('.csv') 
    )
    console.log('Total Files Found : ', files.length)

    for(const file of files){

        const filePath = path.join(activationDataFolder, file)

        //Angular Toast Btn
        const toast = page.locator('[role="alert"].toast-message')

        await toast.waitFor({
            state: "hidden",
            timeout: 120000
        })

        //selecting file
        const selection = page.locator('input[type="file"]')
        await selection.waitFor({state: "visible"})
        await selection.setInputFiles(filePath)

        console.log(`Uploading ${file}...`)

        //click upload
        const uploadBtn = page.getByRole('button', {
            name: 'Upload',
            exact: true
        });

        await uploadBtn.waitFor({state: "visible"})
        await uploadBtn.click()
        
        await toast.waitFor({
            state: "visible",
            timeout: 300000
        })

        const message = await toast.innerText();

        console.log(message);

        // Failed Files download and save in "failed-reports" folder
        if(message.toLowerCase().includes('failed')){
            
            const downloadBtn = page.locator('button.btn.btn-title').filter({ hasText: 'Download' })

            await downloadBtn.waitFor({
                state: "visible",
                timeout: 120000
            });
            const downloadPromise = page.waitForEvent('download');
            await downloadBtn.click();
            const download = await downloadPromise;

            // Save failed report
            const downloadFolder = path.join(activationFolder, 'activation-failed-reports')

            fs.mkdirSync(downloadFolder, { recursive: true });

            const orignalFileName = path.parse(file).name
            const fileName = GeneratedFileRename(orignalFileName, 'failed-activation')

            await download.saveAs(
                path.join(downloadFolder, fileName)
            );
            console.log(`👇🏻 ${file} downloaded`)
        }

        else if(message.toLowerCase().includes('successfully')){
            console.log(`🎉 ${file} uploaded succesfully`)
        }

        DesktopNotification(
            "Activation Completed 🎉",
            "Activation file created and uploded successfully!"
        );

        await page.waitForTimeout(5000)
    }
}