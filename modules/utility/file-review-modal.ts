
import type { Page } from "playwright";
import path from "node:path";
import open from "open";

declare global {
    interface Window {
        openGeneratedExcelFile: (outputPath: string) => Promise<void>;
    }
}

// Register browser function only once
export async function RegisterFileOpenFunction(page: Page) {

    await page.exposeFunction(
        "openGeneratedExcelFile",
        async (outputPath: string) => {
            await open(outputPath);
        }
    );

}


export async function ShowFileReviewModal(
    page: Page,
    outputPath: string,
    title: string = "Excel File Created Successfully"
) {

    const fileName = path.basename(outputPath);

    // Browser mein modal create karo
    await page.evaluate(({ fileName, outputPath, title }) => {

        const modal = document.createElement("div");

        modal.id = "file-review-modal";

        modal.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            background: rgba(0, 0, 0, 0.65);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
        `;

        const card = document.createElement("div");

        card.style.cssText = `
            background: white;
            color: #222;
            width: 420px;
            max-width: 90%;
            padding: 28px;
            border-radius: 14px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.25);
        `;

        const heading = document.createElement("h2");
        heading.textContent = title;

        heading.style.cssText = `
            font-size: 21px;
            margin: 0 0 12px;
        `;

        const description = document.createElement("p");

        description.textContent =
            "Please review your generated Excel file before uploading.";

        description.style.cssText = `
            color: #666;
            font-size: 14px;
            line-height: 1.5;
        `;

        const fileLink = document.createElement("a");

        fileLink.href = "#";
        fileLink.textContent = "📊 " + fileName;

        fileLink.style.cssText = `
            display: block;
            margin: 20px 0;
            padding: 14px;
            background: #f0f7f1;
            color: #16803c;
            border-radius: 8px;
            text-decoration: underline;
            font-weight: bold;
            cursor: pointer;
            word-break: break-all;
        `;

        fileLink.addEventListener("click", (event) => {

            event.preventDefault();

            window.openGeneratedExcelFile(outputPath);

        });

        const continueButton = document.createElement("button");

        continueButton.textContent = "Continue to Upload";

        continueButton.style.cssText = `
            width: 100%;
            padding: 13px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
        `;

        continueButton.addEventListener("click", () => {

            modal.dataset.continue = "true";

            continueButton.textContent = "Continuing...";

            continueButton.disabled = true;

        });

        card.appendChild(heading);
        card.appendChild(description);
        card.appendChild(fileLink);
        card.appendChild(continueButton);

        modal.appendChild(card);

        document.body.appendChild(modal);

    }, { fileName, outputPath, title });

    console.log(`Waiting for file review: ${fileName}`);

    // Continue button click hone tak wait karo
    await page.waitForFunction(
        () => {
            const modal = document.getElementById("file-review-modal");

            return modal?.dataset.continue === "true";
        },
        null,
        { timeout: 0 }
    );

    // Modal remove karo
    await page.evaluate(() => {
        document.getElementById("file-review-modal")?.remove();
    });

    console.log("File review completed. Continuing automation...");
    console.log("--------------------------------");

}
