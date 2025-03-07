import {
  fetchHTMLContent,
  extractContent,
  handleFormSubmission,
} from "./popoverHandlers";
export class GlobalPopover {
  constructor() {
    this.createPopover();
    this.attachGlobalEventListeners();
  }

  createPopover() {
    this.popover = document.createElement("div");
    this.popover.classList.add("global-popover");
    this.popover.id = "global-popover";
    this.popover.setAttribute("popover", "manual");
    this.popover.innerHTML = `
      <button id="popover-close" class="absolute top-2 right-2 m-0 p-0 flex items-center justify-center bg-transparent border-none outline-none cursor-pointer" aria-label="Close popover">
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
      const doc = await fetchHTMLContent(url);
      const content = extractContent(
        doc,
        customSelector || cutAttribute,
        "[data-popover-main-content]"
      );
      this.showPopover(content);
      this.attachFormInterception();
    } catch (error) {
      this.showPopover("<p>Error loading content.</p>");
      console.error(error);
    }
  }

  showPopover(content) {
    this.popoverContent.innerHTML = content;
    this.popover.showPopover();
    this.attachFormInterception();
  }

  hidePopover() {
    this.popover.hidePopover();
  }

  attachFormInterception() {
    const forms = this.popoverContent.querySelectorAll("[data-popover-form]");
    if (!forms.length) return;
    forms.forEach((form) =>
      form.addEventListener("submit", (event) =>
        handleFormSubmission(event, this)
      )
    );
  }
}
