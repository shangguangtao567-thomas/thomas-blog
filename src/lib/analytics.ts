import { hasPlausible, siteConfig } from './siteConfig';

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: {
        props?: Record<string, string | number | boolean>;
        u?: string;
      }
    ) => void;
  }
}

export function ensurePlausible() {
  if (!hasPlausible || typeof document === 'undefined') return;
  if (document.querySelector('script[data-growth-analytics="plausible"]')) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://plausible.io/js/script.outbound-links.pageview-props.tagged-events.js';
  script.dataset.domain = siteConfig.plausibleDomain;
  script.dataset.growthAnalytics = 'plausible';
  document.head.appendChild(script);
}

export function trackGrowthEvent(eventName: string, props: Record<string, string | number | boolean> = {}) {
  if (typeof window === 'undefined' || typeof window.plausible !== 'function') return;
  window.plausible(eventName, { props });
}

export function trackPageview(path: string) {
  if (typeof window === 'undefined' || typeof window.plausible !== 'function') return;
  window.plausible('pageview', { u: new URL(path, window.location.origin).toString() });
}
