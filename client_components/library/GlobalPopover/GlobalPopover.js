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
            <button id="popover-close" class="absolute top-2 right-2 m-0 p-0" aria-label="Close popover">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000">
                    <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
                </svg>
            </button>
            <div id="popover-content"></div>
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

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch content.");
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      let content = doc.body.innerHTML; // Default: full page content

      if (customSelector) {
        const selected = doc.querySelector(customSelector);
        if (selected) {
          content = selected.outerHTML;
        }
      } else {
        const defaultSelector = "[data-popover-main-content]";
        const defaultElement = doc.querySelector(defaultSelector);
        if (defaultElement) {
          content = defaultElement.outerHTML;
        }
      }

      this.showPopover(content);
      this.attachFormInterception();
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
    this.attachFormInterception();
  }

  hidePopover() {
    if (typeof this.popover.hidePopover === "function") {
      this.popover.hidePopover();
    } else {
      this.popover.style.display = "none";
    }
  }

  attachFormInterception() {
    const form = this.popoverContent.querySelector("[data-popover-form]");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const action = form.getAttribute("action");
      const method = form.getAttribute("method") || "POST";

      try {
        const response = await fetch(action, {
          method: method.toUpperCase(),
          body: method.toUpperCase() === "GET" ? null : formData,
          headers: {
            "X-Requested-With": "XMLHttpRequest", // Indicate it's an AJAX request
          },
        });

        // Check if the response is an HTML page or a redirect
        const contentType = response.headers.get("Content-Type");
        if (response.redirected) {
          this.hidePopover();
          window.location.href = response.url; // Follow redirect
        } else if (contentType && contentType.includes("text/html")) {
          const htmlText = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, "text/html");

          let content = doc.body.innerHTML;

          // Extract specific content if `data-popover-main-content` is found
          const defaultSelector = "[data-popover-main-content]";
          const defaultElement = doc.querySelector(defaultSelector);
          if (defaultElement) {
            content = defaultElement.outerHTML;
          }

          this.showPopover(content);
          this.attachFormInterception(); // Re-attach form handling
        }
      } catch (error) {
        console.error("Error submitting form:", error);
        this.showPopover("<p>Form submission failed.</p>");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => new GlobalPopover());
