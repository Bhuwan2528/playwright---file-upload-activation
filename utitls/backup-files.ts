import fs from "node:fs";
import path from "node:path";

export async function BackupGeneratedFiles(): Promise<string[]> {

    const dataFolder = path.join(process.cwd(), 'data');

    // All generated file folders
    const outputFolders = [
        path.join(dataFolder, 'activation', 'activation-data'),
        path.join(dataFolder, 'activation', 'activation-failed-reports'),

        path.join(dataFolder, 'finance', 'finance-data'),
        path.join(dataFolder, 'finance', 'finance-failed-reports'),

        path.join(dataFolder, 'failed-activation', 'failed-activation-raw-data'),
        path.join(dataFolder, 'failed-activation', 'stock-import'),
        path.join(dataFolder, 'failed-activation', 'upload-primary')
    ];

    // Create today's date folder
    const date = new Date();

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    const dateFolder = `${day}-${month}-${year}`;

    const backupFolder = path.join(
        process.cwd(),
        'backup',
        dateFolder
    );

    fs.mkdirSync(backupFolder, { recursive: true });

    // Store successfully backed-up original file paths
    const backedUpFiles: string[] = [];

    // Read files from every output folder
    for (const folder of outputFolders) {

        if (!fs.existsSync(folder)) {
            continue;
        }

        const files = fs.readdirSync(folder);

        for (const file of files) {

            if (file.startsWith('~$')) {
                continue;
            }

            const sourcePath = path.join(folder, file);

            if (!fs.statSync(sourcePath).isFile()) {
                continue;
            }

            // Create a unique filename to avoid overwriting
            const extension = path.extname(file);
            const name = path.basename(file, extension);

            let backupPath = path.join(backupFolder, file);
            let counter = 1;

            while (fs.existsSync(backupPath)) {

                backupPath = path.join(
                    backupFolder,
                    `${name} (${counter})${extension}`
                );

                counter++;
            }

            // Copy file to backup folder
            await fs.promises.copyFile(sourcePath, backupPath);

            backedUpFiles.push(sourcePath);

            console.log(`Backup completed: ${file}`);
        }
    }

    console.log('--------------------------------');
    console.log('Backup Process Completed!');
    console.log('Total Files:', backedUpFiles.length);
    console.log('Backup Location:', backupFolder);
    console.log('--------------------------------');

    return backedUpFiles;
}
