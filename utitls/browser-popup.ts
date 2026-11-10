
import type { Page } from "playwright";

export async function BrowserPopup(
    page: Page,
    title: string,
    message: string = "",
    color?: "red" | "green",
    duration: number = 3000,
): Promise<void> {

    if (page.isClosed()) return;

    try {

        await page.evaluate(({ title, message, duration, color }) => {

            // Popup Container
            let container = document.getElementById("automation-popup-container");

            if (!container) {

                container = document.createElement("div");
                container.id = "automation-popup-container";

                Object.assign(container.style, {
                    position: "fixed",
                    bottom: "120px",
                    right: "24px",
                    width: "min(380px, calc(100vw - 32px))",
                    maxHeight: "75vh",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    overflowY: "auto",
                    zIndex: "2147483647",
                    pointerEvents: "none",
                    fontFamily: "Segoe UI, Arial, sans-serif"
                });

                document.body.appendChild(container);
            }

            // Notification Type
            const text = `${title} ${message}`.toLowerCase();

            let accentColor = "#64748b";

            // Custom color has priority
            if (color === "red") {
                accentColor = "#dc5555";
            }
            else if (color === "green") {
                accentColor = "#16a36a";
            }
            else if (
                text.includes("failed") ||
                text.includes("error") ||
                text.includes("warning") ||
                text.includes("❌") ||
                text.includes("🔺")
            ) {
                accentColor = "#dc5555";
            }
            else if (
                text.includes("success") ||
                text.includes("completed") ||
                text.includes("🎉") ||
                text.includes("✅") ||
                text.includes("⚡")
            ) {
                accentColor = "#16a36a";
            }

            // Notification Card
            const toast = document.createElement("div");

            Object.assign(toast.style, {
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: message.trim() ? "7px" : "0",
                padding: "17px 42px 17px 18px",
                background: "#ffffff",
                color: "#172033",
                border: "1px solid #e8ebf0",
                borderLeft: `4px solid ${accentColor}`,
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
                pointerEvents: "auto",
                overflow: "hidden",
                animation: "automation-popup-enter 0.3s ease forwards"
            });

            // Title
            const heading = document.createElement("div");

            heading.textContent = title;

            Object.assign(heading.style, {
                fontSize: "14px",
                fontWeight: "650",
                lineHeight: "1.5",
                color: "#172033",
                overflowWrap: "anywhere"
            });

            toast.appendChild(heading);

            // Optional Description
            if (message.trim()) {

                const description = document.createElement("div");

                description.textContent = message;

                Object.assign(description.style, {
                    fontSize: "12.5px",
                    fontWeight: "400",
                    lineHeight: "1.6",
                    color: "#64748b",
                    overflowWrap: "anywhere"
                });

                toast.appendChild(description);
            }

            // Close Button
            const closeBtn = document.createElement("button");

            closeBtn.textContent = "×";

            Object.assign(closeBtn.style, {
                position: "absolute",
                top: "9px",
                right: "11px",
                padding: "2px 5px",
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                fontSize: "21px",
                fontWeight: "400",
                lineHeight: "1",
                cursor: "pointer"
            });

            closeBtn.addEventListener("mouseenter", function () {
                closeBtn.style.color = "#334155";
            });

            closeBtn.addEventListener("mouseleave", function () {
                closeBtn.style.color = "#94a3b8";
            });

            toast.appendChild(closeBtn);

            // Progress Bar
            let progress: HTMLDivElement | undefined;

            if (duration > 0) {

                progress = document.createElement("div");

                Object.assign(progress.style, {
                    position: "absolute",
                    bottom: "0",
                    left: "0",
                    height: "3px",
                    width: "100%",
                    background: accentColor,
                    animation: `automation-popup-progress ${duration}ms linear forwards`
                });

                toast.appendChild(progress);
            }

            // Add Animations
            if (!document.getElementById("automation-popup-style")) {

                const style = document.createElement("style");

                style.id = "automation-popup-style";

                style.textContent = `
                    @keyframes automation-popup-enter {
                        from {
                            opacity: 0;
                            transform: translateX(25px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }

                    @keyframes automation-popup-progress {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                `;

                document.head.appendChild(style);
            }

            // Timer Management
            let timer: number | undefined;
            let startTime = 0;
            let remainingTime = duration;
            let removed = false;

            // Remove Notification
            toast.addEventListener("automation-dismiss", function () {

                if (removed) return;

                removed = true;

                if (timer !== undefined) {
                    window.clearTimeout(timer);
                    timer = undefined;
                }

                toast.style.opacity = "0";
                toast.style.transform = "translateX(25px)";
                toast.style.transition = "all 0.25s ease";

                window.setTimeout(function () {
                    toast.remove();
                }, 250);
            });

            // Start Timer
            toast.addEventListener("automation-start", function () {

                if (removed || timer !== undefined || duration <= 0) return;

                if (remainingTime <= 0) {
                    toast.dispatchEvent(new Event("automation-dismiss"));
                    return;
                }

                startTime = Date.now();

                timer = window.setTimeout(function () {
                    toast.dispatchEvent(new Event("automation-dismiss"));
                }, remainingTime);

                if (progress) {
                    progress.style.animationPlayState = "running";
                }
            });

            // Pause Timer on Hover
            toast.addEventListener("mouseenter", function () {

                if (timer === undefined || removed) return;

                window.clearTimeout(timer);
                timer = undefined;

                remainingTime -= Date.now() - startTime;

                if (progress) {
                    progress.style.animationPlayState = "paused";
                }
            });

            // Resume Timer on Mouse Leave
            toast.addEventListener("mouseleave", function () {
                toast.dispatchEvent(new Event("automation-start"));
            });

            // Manual Close
            closeBtn.addEventListener("click", function () {
                toast.dispatchEvent(new Event("automation-dismiss"));
            });

            // Show Popup
            container!.appendChild(toast);

            toast.dispatchEvent(new Event("automation-start"));

        }, { title, message, duration, color });

    } catch (error) {

        console.warn("⚠ Browser Popup Failed:", error);
    }
}
