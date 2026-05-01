export function dispatchStatsRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("syncro:stats:refresh"));
}
