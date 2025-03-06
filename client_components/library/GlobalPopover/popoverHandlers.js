export function extractContent(doc, selector, fallbackSelector) {
  if (selector) {
    const selected = doc.querySelector(selector);
    if (selected) return selected.outerHTML;
  }
  const fallback = doc.querySelector(fallbackSelector);
  return fallback ? fallback.outerHTML : doc.body.innerHTML;
}

export async function handleFormSubmission(event, popoverInstance) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const action = form.getAttribute("action");
  const method = form.getAttribute("method") || "POST";
  const followRedirect = form.hasAttribute("data-popover-follow-redirect");
  const injectSelector = form.getAttribute("data-popover-inject");
  const responseSelector = form.getAttribute("data-popover-response-selector");

  try {
    const response = await fetch(action, {
      method: method.toUpperCase(),
      body: method.toUpperCase() === "GET" ? null : formData,
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    if (response.redirected) {
      if (followRedirect) {
        popoverInstance.hidePopover();
        window.location.href = response.url;
      } else {
        const doc = await fetchHTMLContent(response.url);
        const content = extractContent(
          doc,
          responseSelector,
          "[data-popover-main-content]"
        );
        if (injectSelector) {
          document.querySelector(injectSelector).innerHTML = content;
        } else {
          popoverInstance.showPopover(content);
          popoverInstance.attachFormInterception();
        }
      }
    } else {
      await handleResponse(response, responseSelector, popoverInstance);
    }
  } catch (error) {
    console.error("Error submitting form:", error);
    popoverInstance.showPopover("<p>Form submission failed.</p>");
  }
}

export async function fetchHTMLContent(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch content.");
  const htmlText = await response.text();
  return new DOMParser().parseFromString(htmlText, "text/html");
}

export async function handleResponse(
  response,
  responseSelector,
  popoverInstance
) {
  const doc = await fetchHTMLContent(response.url || response);
  const content = extractContent(
    doc,
    responseSelector,
    "[data-popover-main-content]"
  );
  popoverInstance.showPopover(content);
  popoverInstance.attachFormInterception();
}
