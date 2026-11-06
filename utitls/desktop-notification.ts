
import notifier from "node-notifier";
import fs from "node:fs";
import path from "node:path";

export function DesktopNotification(
    title: string,
    message: string
) {
    const iconPath = path.join(
        process.cwd(),
        "assets",
        "automation.png"
    );

    notifier.notify({
        title,
        message,
        icon: fs.existsSync(iconPath)
            ? iconPath
            : undefined,
        sound: true,
        wait: false
    });
}
