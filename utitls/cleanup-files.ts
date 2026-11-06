
import fs from "node:fs";

export async function CleanupGeneratedFiles(backedUpFiles: string[]) {

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
}
