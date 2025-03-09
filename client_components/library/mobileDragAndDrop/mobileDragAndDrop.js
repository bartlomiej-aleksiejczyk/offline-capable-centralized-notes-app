class MobileDragAndDrop {
  constructor() {
    this.draggingEl = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scrollInterval = null;

    this.onDragStart = null;
    this.onDragMove = null;
    this.onDragEnd = null;
  }

  static enable(draggableItems, instance) {
    draggableItems.forEach((item) => {
      item.style.touchAction = "none";
      item.addEventListener("pointerdown", (e) =>
        instance.pointerDownHandler(e, item)
      );
      item.addEventListener("touchstart", (e) =>
        instance.pointerDownHandler(e, item)
      );
    });
  }

  pointerDownHandler(e, item) {
    if (e.touches && e.touches.length > 1) return;

    this.draggingEl = item;
    const rect = item.getBoundingClientRect();

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

    if (this.onDragStart) {
      this.onDragStart({
        element: this.draggingEl,
        originalX: clientX,
        originalY: clientY,
      });
    }
  }

  pointerMoveHandler(e) {
    if (!this.draggingEl) return;

    let clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
    let clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);

    if (this.onDragMove) {
      this.onDragMove({
        element: this.draggingEl,
        x: clientX - this.offsetX,
        y: clientY - this.offsetY,
      });
    }

    this.handleAutoScroll(e);
  }

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

    if (this.onDragEnd) {
      this.onDragEnd({
        element: this.draggingEl,
      });
    }

    this.draggingEl = null;
  }

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
