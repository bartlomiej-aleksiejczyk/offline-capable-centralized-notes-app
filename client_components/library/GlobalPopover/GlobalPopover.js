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
    const cutAttribute = link.getAttribute("data-popover-cut");

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
      } else if (cutAttribute) {
        const selected = doc.querySelector(cutAttribute);
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
    this.attachFormInterception(); // Ensure forms are intercepted
  }

  hidePopover() {
    if (typeof this.popover.hidePopover === "function") {
      this.popover.hidePopover();
    } else {
      this.popover.style.display = "none";
    }
  }

  attachFormInterception() {
    const forms = this.popoverContent.querySelectorAll("[data-popover-form]");
    if (!forms.length) return;

    forms.forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const action = form.getAttribute("action");
        const method = form.getAttribute("method") || "POST";
        const followRedirect = form.hasAttribute(
          "data-popover-follow-redirect"
        );
        const injectSelector = form.getAttribute("data-popover-inject");
        const responseSelector = form.getAttribute(
          "data-popover-response-selector"
        ); // NEW: Custom response selector

        try {
          const response = await fetch(action, {
            method: method.toUpperCase(),
            body: method.toUpperCase() === "GET" ? null : formData,
            headers: {
              "X-Requested-With": "XMLHttpRequest",
            },
          });

          if (response.redirected) {
            if (followRedirect) {
              this.hidePopover();
              window.location.href = response.url;
            } else {
              this.fetchAndInject(
                response.url,
                injectSelector,
                responseSelector
              );
            }
          } else if (response.ok) {
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");

            let content = doc.body.innerHTML;
            if (responseSelector) {
              const selected = doc.querySelector(responseSelector);
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
          } else {
            // Handle non-successful responses (4xx, 5xx)
            const errorText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(errorText, "text/html");
            let errorContent = doc.body.innerHTML;
            if (responseSelector) {
              const selected = doc.querySelector(responseSelector);
              if (selected) {
                errorContent = selected.outerHTML;
              }
            }
            this.showPopover(errorContent); // Keep popover open & show error
          }
        } catch (error) {
          console.error("Error submitting form:", error);
          this.showPopover("<p>Form submission failed.</p>");
        }
      });
    });
  }

  async fetchAndInject(url, selector, responseSelector) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch redirect content.");
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      let content = doc.body.innerHTML;
      if (responseSelector) {
        const selected = doc.querySelector(responseSelector);
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

      if (selector) {
        document.querySelector(selector).innerHTML = content;
      } else {
        this.showPopover(content);
        this.attachFormInterception();
      }
    } catch (error) {
      console.error("Error fetching and injecting content:", error);
    }
  }
}
