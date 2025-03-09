/**
 * MobileDragAndDrop - A headless drag-and-drop library supporting multiple containers and Shadow DOM.
 *
 * Features:
 * - Allows specifying multiple containers in different ShadowRoots.
 * - Supports mobile (`touch`) and desktop (`pointer`) events.
 * - Detects hovered elements with `data-dragitem` and `data-dragitem-index`.
 * - Supports drag-and-drop within multiple Web Components.
 * - Auto-scrolls when dragging near screen edges.
 *
 * Example Usage (Web Component):
 * ----------------------------
 * class MyComponent extends HTMLElement {
 *   constructor() {
 *     super();
 *     this.attachShadow({ mode: "open" });
 *     this.shadowRoot.innerHTML = `
 *       <div id="container">
 *         <div class="draggable" data-dragitem-index="1">Item 1</div>
 *         <div class="draggable" data-dragitem-index="2">Item 2</div>
 *       </div>
 *     `;
 *   }
 *
 *   connectedCallback() {
 *     const dnd = new MobileDragAndDrop([this.shadowRoot.querySelector("#container")], this.shadowRoot);
 *     MobileDragAndDrop.enable(".draggable", dnd);
 *   }
 * }
 * customElements.define("my-component", MyComponent);
 */

class MobileDragAndDrop {
  constructor(containers = [], root = document) {
    this.draggingEl = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scrollInterval = null;
    this.root = root;
    this.containers = containers.filter(Boolean);

    // Event hooks (set externally)
    this.onDragStart = null;
    this.onDragMove = null;
    this.onDragEnd = null;
  }

  /**
   * Enables drag-and-drop on specified elements inside the given root.
   * @param {string} selector - CSS selector for draggable elements.
   * @param {MobileDragAndDrop} instance - An instance of MobileDragAndDrop.
   */
  static enable(selector, instance) {
    const draggableItems = instance.root.querySelectorAll(selector);
    draggableItems.forEach((item) => {
      item.style.touchAction = "none"; // Prevent default gestures
      item.addEventListener("pointerdown", (e) =>
        instance.pointerDownHandler(e, item)
      );
      item.addEventListener("touchstart", (e) =>
        instance.pointerDownHandler(e, item)
      );
    });
  }

  /**
   * Handles the start of a drag event.
   * @param {Event} e - The event object.
   * @param {HTMLElement} item - The item being dragged.
   */
  pointerDownHandler(e, item) {
    if (e.touches && e.touches.length > 1) return; // Ignore multi-touch

    this.draggingEl = item;
    const rect = item.getBoundingClientRect();

    // Normalize touch and pointer events
    let clientX = e.clientX ?? e.touches[0].clientX;
    let clientY = e.clientY ?? e.touches[0].clientY;

    this.offsetX = clientX - rect.left;
    this.offsetY = clientY - rect.top;

    document.addEventListener(
      "pointermove",
      this.pointerMoveHandler.bind(this)
    );
    document.addEventListener("pointerup", this.pointerUpHandler.bind(this));

    document.addEventListener("touchmove", this.pointerMoveHandler.bind(this), {
      passive: false,
    });
    document.addEventListener("touchend", this.pointerUpHandler.bind(this));

    e.preventDefault();

    // Trigger drag start event
    if (this.onDragStart) {
      this.onDragStart({
        element: this.draggingEl,
        originalX: clientX,
        originalY: clientY,
      });
    }
  }

  /**
   * Handles the movement of a dragged element.
   * @param {Event} e - The event object.
   */
  pointerMoveHandler(e) {
    if (!this.draggingEl) return;

    let clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    let clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);

    // Get the correct shadow root or document for element detection
    let container = this.containers.find((cont) =>
      cont.contains(this.getElementFromPoint(clientX, clientY))
    );

    let hoverElement = null;
    let hoverIndex = null;

    if (container) {
      this.draggingEl.hidden = true;
      let hoveredElement = this.getElementFromPoint(clientX, clientY);
      this.draggingEl.hidden = false;

      if (hoveredElement) {
        hoverElement = hoveredElement.closest("[data-dragitem]");
        if (hoverElement) {
          hoverIndex = hoverElement.getAttribute("data-dragitem-index");
        }
      }
    }

    // Trigger drag move event
    if (this.onDragMove) {
      this.onDragMove({
        element: this.draggingEl,
        x: clientX - this.offsetX,
        y: clientY - this.offsetY,
        hoverElement: hoverElement,
        hoverIndex: hoverIndex,
        container: container, // The container the item is currently in
      });
    }

    this.handleAutoScroll(e);
  }

  /**
   * Handles the end of a drag event.
   * @param {Event} e - The event object.
   */
  pointerUpHandler(e) {
    document.removeEventListener(
      "pointermove",
      this.pointerMoveHandler.bind(this)
    );
    document.removeEventListener("pointerup", this.pointerUpHandler.bind(this));

    document.removeEventListener(
      "touchmove",
      this.pointerMoveHandler.bind(this)
    );
    document.removeEventListener("touchend", this.pointerUpHandler.bind(this));

    clearInterval(this.scrollInterval);

    let finalX =
      e.clientX ?? (e.changedTouches ? e.changedTouches[0].clientX : 0);
    let finalY =
      e.clientY ?? (e.changedTouches ? e.changedTouches[0].clientY : 0);

    if (this.onDragEnd) {
      this.onDragEnd({
        element: this.draggingEl,
        finalX: finalX,
        finalY: finalY,
      });
    }

    this.draggingEl = null;
  }

  /**
   * Handles auto-scrolling when dragging near the screen edges.
   * @param {Event} e - The event object.
   */
  handleAutoScroll(e) {
    const scrollMargin = 50;
    const maxScrollSpeed = 20;
    const minScrollSpeed = 5;

    clearInterval(this.scrollInterval);

    let clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);

    if (clientY < scrollMargin) {
      let speed = Math.max(
        maxScrollSpeed * (1 - clientY / scrollMargin),
        minScrollSpeed
      );
      this.scrollInterval = setInterval(() => window.scrollBy(0, -speed), 20);
    } else if (clientY > window.innerHeight - scrollMargin) {
      let speed = Math.max(
        maxScrollSpeed *
          ((clientY - (window.innerHeight - scrollMargin)) / scrollMargin),
        minScrollSpeed
      );
      this.scrollInterval = setInterval(() => window.scrollBy(0, speed), 20);
    }
  }

  /**
   * Returns the element under the given coordinates, even inside Shadow DOM.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @returns {HTMLElement|null} - The hovered element.
   */
  getElementFromPoint(x, y) {
    let el = document.elementFromPoint(x, y);
    if (el && el.shadowRoot) {
      return el.shadowRoot.elementFromPoint(x, y) || el;
    }
    return el;
  }
}
