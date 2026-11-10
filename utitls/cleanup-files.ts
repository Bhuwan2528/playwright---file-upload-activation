
import fs from "node:fs";
import { BrowserPopup } from "./browser-popup.js";
import type { Page } from "playwright";

export async function CleanupGeneratedFiles(backedUpFiles: string[], page: Page) {

    if (backedUpFiles.length === 0) {
        console.log('No files available for cleanup.');
        return;
    }

    for (const file of backedUpFiles) {

        if (!fs.existsSync(file)) {
            continue;
        }

        await fs.promises.unlink(file);

        // console.log(`Deleted: ${file}`);
    }

    console.log('--------------------------------');
    console.log('Cleanup Completed!');
    console.log('Deleted Files:', backedUpFiles.length);
    console.log('--------------------------------');

    BrowserPopup(
        page,
        "⚡ Backup and Cleanup Done ",
        "Backup and Cleanup of all genrated files are done"
    );
}
