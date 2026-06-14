(() => {
  const RELEASE = "80";

  if (!("serviceWorker" in navigator)) {
    return;
  }

  let reloadedForServiceWorker = false;
  let registration;

  const checkForUpdate = () => {
    if (registration) {
      registration.update().catch(() => {
        // Keep the site functional if an update check fails.
      });
    }
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadedForServiceWorker) {
      return;
    }

    reloadedForServiceWorker = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`./service-worker.js?v=${RELEASE}`, { updateViaCache: "none" })
      .then((activeRegistration) => {
        registration = activeRegistration;
        checkForUpdate();
      })
      .catch(() => {
        // Keep the site functional even if service worker registration fails.
      });
  });

  window.addEventListener("pageshow", checkForUpdate);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkForUpdate();
    }
  });
})();
