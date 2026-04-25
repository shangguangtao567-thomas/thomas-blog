import rawConfig from '../../site.config.json';

const defaultSiteConfig = {
  siteName: "Thomas's Blog",
  siteUrl: 'https://blog.lincept.com',
  authorName: 'Thomas',
  xHandle: '@GuangtaoS29545',
  xProfileUrl: 'https://x.com/GuangtaoS29545',
  buttondownUrl: '',
  contactEmail: '',
  plausibleDomain: '',
  primaryTopics: ['AI', 'Tools', 'Infrastructure', 'Open Source'],
};

export const siteConfig = {
  ...defaultSiteConfig,
  ...(rawConfig as Partial<typeof defaultSiteConfig>),
};

const buttondownUrl = String(siteConfig.buttondownUrl || '').trim();
const contactEmail = String((siteConfig as typeof defaultSiteConfig & { contactEmail?: string }).contactEmail || '').trim();
const plausibleDomain = String(siteConfig.plausibleDomain || '').trim();
const buttondownFormPattern = /^https:\/\/buttondown\.email\/api\/emails\/embed-subscribe\/[^/?#]+\/?$/i;

export const hasNewsletter = Boolean(buttondownUrl);
export const hasContactEmail = Boolean(contactEmail);
export const hasPlausible = Boolean(plausibleDomain);
export const hasNewsletterForm = buttondownFormPattern.test(buttondownUrl);
export const hasNewsletterHostedPage = hasNewsletter && !hasNewsletterForm;

export const subscribeKind = hasNewsletterForm ? 'newsletter-form' : hasNewsletterHostedPage ? 'newsletter-link' : hasContactEmail ? 'mailto-form' : 'rss';
export const subscribeHref = hasNewsletter ? buttondownUrl : hasContactEmail ? `mailto:${contactEmail}` : '/feed.xml';
export const subscribeLabel = hasNewsletterForm ? 'Join by email' : hasNewsletterHostedPage ? 'Open email signup' : hasContactEmail ? 'Join early readers' : 'Read RSS';
export const subscribeHeading = hasNewsletter || hasContactEmail ? 'Join early readers' : 'Read via RSS';
export const subscribeHelperCopy = hasNewsletterForm
  ? 'Email delivery is live. New essays and briefing issues can arrive directly in your inbox.'
  : hasNewsletterHostedPage
    ? 'Email delivery is available through the hosted signup page until the embedded form endpoint is configured here.'
    : hasContactEmail
      ? 'Get the daily AI signal and occasional essays. No spam, just the notes worth keeping.'
      : 'This site currently publishes through RSS only.';
export const subscribeSecondaryHref = siteConfig.xProfileUrl;
export const subscribeSecondaryLabel = 'Follow on X';
export const subscribeSecondaryKind = 'social';
export const subscribeContract = {
  kind: subscribeKind,
  href: subscribeHref,
  label: subscribeLabel,
  heading: subscribeHeading,
  helperCopy: subscribeHelperCopy,
  secondaryHref: subscribeSecondaryHref,
  secondaryLabel: subscribeSecondaryLabel,
  secondaryKind: subscribeSecondaryKind,
  external: hasNewsletterHostedPage,
  formAction: hasNewsletterForm ? buttondownUrl : '',
  contactEmail,
  formMethod: 'post',
  formEmailName: 'email',
  formEmbedName: 'embed',
  formEmbedValue: '1',
};
export const hasSubscribeSecondary = Boolean(subscribeSecondaryHref);
