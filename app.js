(() => {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  let reloadedForServiceWorker = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadedForServiceWorker) {
      return;
    }

    reloadedForServiceWorker = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => registration.update())
      .catch(() => {
        // Keep the site functional even if service worker registration fails.
      });
  });
})();
