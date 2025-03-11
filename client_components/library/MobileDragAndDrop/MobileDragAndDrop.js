/**
 * MobileDragAndDrop - A headless drag-and-drop library supporting multiple containers,
 * Shadow DOM, and both attribute-based and selector-based element specification.
 *
 * Configuration Options:
 * - containers: Array of container elements. If not provided, elements matching containerSelector are used.
 * - containerSelector: CSS selector for containers (default: "[data-drag-container]").
 * - draggableSelector: CSS selector for draggable elements (default: "[data-draggable]").
 * - handleSelector: CSS selector for drag handles (default: "[data-drag-handle]"). When specified,
 *   a drag will only start if the event originates from an element matching this selector.
 * - root: The root element to search in (document or a shadowRoot).
 *
 * Example Usage (Web Component):
 * ------------------------------
 * // In your web component's template:
 * // <div data-drag-container>
 * //   <div data-draggable data-dragitem-index="1">Item 1</div>
 * //   <div data-draggable data-dragitem-index="2">Item 2</div>
 * // </div>
 *
 * class MyComponent extends HTMLElement {
 *   constructor() {
 *     super();
 *     this.attachShadow({ mode: "open" });
 *     this.shadowRoot.innerHTML = `
 *       <style>...styles</style>
 *       <div data-drag-container>
 *         <div data-draggable data-dragitem-index="1">Item 1</div>
 *         <div data-draggable data-dragitem-index="2">Item 2</div>
 *       </div>
 *     `;
 *   }
 *
 *   connectedCallback() {
 *     // Create an instance using the shadowRoot as the root.
 *     this.dnd = new MobileDragAndDrop({ root: this.shadowRoot });
 *     // Enable draggables – you can pass an optional selector override if desired.
 *     MobileDragAndDrop.enable(null, this.dnd);
 *
 *     // Optionally, set up callbacks:
 *     this.dnd.onDragStart = (info) => console.log("Drag started", info);
 *     this.dnd.onDragMove = (info) => console.log("Dragging...", info);
 *     this.dnd.onDragEnd = (info) => console.log("Drag ended", info);
 *   }
 * }
 * customElements.define("my-component", MyComponent);
 */
class MobileDragAndDrop {
  /**
   * @param {Object} config - Configuration object.
   * @param {HTMLElement[]} [config.containers] - Array of container elements.
   * @param {string} [config.containerSelector="[data-drag-container]"] - CSS selector for containers.
   * @param {string} [config.draggableSelector="[data-draggable]"] - CSS selector for draggable elements.
   * @param {string} [config.handleSelector="[data-drag-handle]"] - CSS selector for drag handles.
   * @param {HTMLElement|Document} [config.root=document] - The root element (document or shadowRoot).
   */
  constructor(config = {}) {
    // Set default selectors if not provided.
    this.config = Object.assign(
      {
        containerSelector: "[data-drag-container]",
        draggableSelector: "[data-draggable]",
        handleSelector: "[data-drag-handle]",
        root: document,
        containers: null,
      },
      config
    );

    this.root = this.config.root;
    this.containers =
      this.config.containers ||
      Array.from(this.root.querySelectorAll(this.config.containerSelector));

    this.draggingEl = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scrollInterval = null;

    // External event hooks
    this.onDragStart = null;
    this.onDragMove = null;
    this.onDragEnd = null;

    // Bind event handlers once to allow proper removal.
    this.pointerMoveHandler = this.pointerMoveHandler.bind(this);
    this.pointerUpHandler = this.pointerUpHandler.bind(this);
  }

  /**
   * Attaches draggable behavior to elements.
   * You can specify a CSS selector override or rely on the default attribute-based selector.
   * @param {string|null} [selector] - Optional CSS selector for draggable elements.
   * @param {MobileDragAndDrop} instance - An instance of MobileDragAndDrop.
   */
  static enable(selector, instance) {
    const configSelector = selector || instance.config.draggableSelector;
    const draggableItems = instance.root.querySelectorAll(configSelector);
    draggableItems.forEach((item) => {
      // Prevent default browser gestures.
      item.style.touchAction = "none";

      const pointerDownCallback = (e) => {
        // If a drag handle is defined, ensure the event originated from it.
        if (instance.config.handleSelector) {
          if (!e.target.closest(instance.config.handleSelector)) {
            return;
          }
        }
        instance.pointerDownHandler(e, item);
      };

      item.addEventListener("pointerdown", pointerDownCallback);
      item.addEventListener("touchstart", pointerDownCallback, {
        passive: false,
      });
    });
  }

  /**
   * Handles the start of a drag event.
   * @param {Event} e - The event object.
   * @param {HTMLElement} item - The element being dragged.
   */
  pointerDownHandler(e, item) {
    if (e.touches && e.touches.length > 1) return; // Ignore multi-touch

    this.draggingEl = item;
    const rect = item.getBoundingClientRect();

    // Normalize pointer and touch events.
    const clientX = e.clientX ?? e.touches[0].clientX;
    const clientY = e.clientY ?? e.touches[0].clientY;

    // Calculate offset so that the dragged element's position remains relative.
    this.offsetX = clientX - rect.left;
    this.offsetY = clientY - rect.top;

    // Attach move and up/end handlers.
    document.addEventListener("pointermove", this.pointerMoveHandler);
    document.addEventListener("pointerup", this.pointerUpHandler);
    document.addEventListener("touchmove", this.pointerMoveHandler, {
      passive: false,
    });
    document.addEventListener("touchend", this.pointerUpHandler);

    e.preventDefault();

    if (this.onDragStart) {
      this.onDragStart({
        element: this.draggingEl,
        originalX: clientX,
        originalY: clientY,
      });
    }
  }

  /**
   * Handles the movement of the dragged element.
   * Instead of comparing pixel positions directly to define drop zones,
   * it uses attribute-based selectors to determine the hovered container and draggable.
   * @param {Event} e - The event object.
   */
  pointerMoveHandler(e) {
    if (!this.draggingEl) return;

    const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);

    // Instead of relying solely on pixel coordinates,
    // determine the container via the event target’s closest matching container.
    const targetElement = e.target;
    let container = targetElement.closest(this.config.containerSelector);
    if (!container && this.containers.length) {
      container = this.containers.find((cont) => cont.contains(targetElement));
    }

    // Determine the hovered draggable element (if any) using the configured selector.
    const hoverElement = targetElement.closest(this.config.draggableSelector);
    const hoverIndex = hoverElement
      ? hoverElement.getAttribute("data-dragitem-index")
      : null;

    if (this.onDragMove) {
      this.onDragMove({
        element: this.draggingEl,
        x: clientX - this.offsetX,
        y: clientY - this.offsetY,
        hoverElement: hoverElement,
        hoverIndex: hoverIndex,
        container: container,
      });
    }

    this.handleAutoScroll(e);
  }

  /**
   * Handles the end of the drag event.
   * @param {Event} e - The event object.
   */
  pointerUpHandler(e) {
    document.removeEventListener("pointermove", this.pointerMoveHandler);
    document.removeEventListener("pointerup", this.pointerUpHandler);
    document.removeEventListener("touchmove", this.pointerMoveHandler);
    document.removeEventListener("touchend", this.pointerUpHandler);

    clearInterval(this.scrollInterval);

    const finalX =
      e.clientX ?? (e.changedTouches ? e.changedTouches[0].clientX : 0);
    const finalY =
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
   * Uses a fixed scroll margin but relies on the pointer event rather than absolute pixel definitions for drop zones.
   * @param {Event} e - The event object.
   */
  handleAutoScroll(e) {
    const scrollMargin = 50;
    const maxScrollSpeed = 20;
    const minScrollSpeed = 5;

    clearInterval(this.scrollInterval);

    const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);

    if (clientY < scrollMargin) {
      const speed = Math.max(
        maxScrollSpeed * (1 - clientY / scrollMargin),
        minScrollSpeed
      );
      this.scrollInterval = setInterval(() => window.scrollBy(0, -speed), 20);
    } else if (clientY > window.innerHeight - scrollMargin) {
      const speed = Math.max(
        maxScrollSpeed *
          ((clientY - (window.innerHeight - scrollMargin)) / scrollMargin),
        minScrollSpeed
      );
      this.scrollInterval = setInterval(() => window.scrollBy(0, speed), 20);
    }
  }
}
