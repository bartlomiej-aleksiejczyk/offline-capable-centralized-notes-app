/**
 * MobileDragAndDrop - A headless drag-and-drop library for mobile and desktop.
 *
 * This class provides a clean API for drag-and-drop operations without modifying the DOM.
 * It emits events (`onDragStart`, `onDragMove`, `onDragEnd`) that allow developers to
 * implement custom behaviors like element repositioning or UI updates.
 *
 * New Features:
 * - Detects **hovered element** while dragging (`data-dragitem`)
 * - Retrieves the **hovered element's index** (`data-dragitem-index`)
 * - Fully supports **mobile (`touch`) and desktop (`pointer`) events**
 * - **Auto-scrolling** when dragging near screen edges
 *
 * Example Usage (Vanilla JS):
 * ----------------------------
 * const dnd = new MobileDragAndDrop();
 *
 * dnd.onDragStart = ({ element }) => console.log("Drag started:", element);
 * dnd.onDragMove = ({ element, x, y, hoverElement, hoverIndex }) => {
 *   console.log(`Dragging ${element} to ${x}, ${y}`);
 *   if (hoverElement) {
 *      console.log(`Hovering over ${hoverElement} with index ${hoverIndex}`);
 *   }
 * };
 * dnd.onDragEnd = ({ element, finalX, finalY }) => console.log("Drag ended:", element, finalX, finalY);
 *
 * const items = document.querySelectorAll(".draggable");
 * MobileDragAndDrop.enable(items, dnd);
 */

class MobileDragAndDrop {
  constructor() {
    this.draggingEl = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scrollInterval = null;

    // Event hooks (set externally)
    this.onDragStart = null;
    this.onDragMove = null;
    this.onDragEnd = null;
  }

  /**
   * Enables drag-and-drop on a list of elements.
   * @param {NodeList} draggableItems - Elements that should be draggable.
   * @param {MobileDragAndDrop} instance - An instance of MobileDragAndDrop.
   */
  static enable(draggableItems, instance) {
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

    // Check what element is being hovered over
    this.draggingEl.hidden = true; // Temporarily hide to get the real element below
    let hoveredElement = document.elementFromPoint(clientX, clientY);
    this.draggingEl.hidden = false;

    let hoverElement = null;
    let hoverIndex = null;

    if (hoveredElement) {
      hoverElement = hoveredElement.closest("[data-dragitem]");
      if (hoverElement) {
        hoverIndex = hoverElement.getAttribute("data-dragitem-index");
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
}
