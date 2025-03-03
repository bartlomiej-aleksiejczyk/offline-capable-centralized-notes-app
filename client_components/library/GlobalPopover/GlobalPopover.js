export class GlobalPopover {
    constructor() {
        this.createPopover();
        this.attachGlobalEventListeners();
    }

    createPopover() {
        this.popover = document.createElement("div");
        this.popover.id = "global-popover";
        this.popover.setAttribute("popover", "auto");
        this.popover.innerHTML = `
            <div id="popover-content"></div>
            <button id="popover-close" aria-label="Close popover">✖</button>
        `;
        document.body.appendChild(this.popover);

        this.popoverContent = document.getElementById("popover-content");
        this.popoverClose = document.getElementById("popover-close");

        this.popoverClose.addEventListener("click", () => this.hidePopover());
    }

    attachGlobalEventListeners() {
        document.addEventListener("click", (event) => this.handleClick(event));
        document.addEventListener("keydown", (event) => this.handleKeydown(event));
    }

    handleClick(event) {
        const link = event.target.closest("[data-popover]");
        if (link) {
            event.preventDefault();
            this.loadPopoverContent(link);
        } else if (!this.popover.contains(event.target)) {
            this.hidePopover();
        }
    }

    handleKeydown(event) {
        if (event.key === "Escape") {
            this.hidePopover();
        }
    }

    async loadPopoverContent(link) {
        const url = link.getAttribute("href");
        const customSelector = link.getAttribute("data-popover-selector");
        const cutAttribute = link.getAttribute("data-popover-cut");

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch content.");
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");

            let content = doc.body.innerHTML; // Fallback: load entire page

            if (customSelector) {
                const selected = doc.querySelector(customSelector);
                if (selected) {
                    content = selected.outerHTML;
                }
            }
            else if (cutAttribute) {
                const selected = doc.querySelector(cutAttribute);
                if (selected) {
                    content = selected.outerHTML;
                }
            }
            else {
                const defaultSelector = "[data-popover-main-content]";
                const defaultElement = doc.querySelector(defaultSelector);
                if (defaultElement) {
                    content = defaultElement.outerHTML;
                }
            }

            this.showPopover(content);
        } catch (error) {
            this.showPopover("<p>Error loading content.</p>");
            console.error(error);
        }
    }

    showPopover(content) {
        this.popoverContent.innerHTML = content;
        if (typeof this.popover.showPopover === "function") {
            this.popover.showPopover();
        } else {
            this.popover.style.display = "block";
        }
    }

    hidePopover() {
        if (typeof this.popover.hidePopover === "function") {
            this.popover.hidePopover();
        } else {
            this.popover.style.display = "none";
        }
    }
}


