import { trackGrowthEvent } from '../lib/analytics';
import { hasNewsletter, siteConfig } from '../lib/siteConfig';

interface GrowthActionsProps {
  language: 'zh' | 'en';
  context: string;
  compact?: boolean;
  className?: string;
}

function actionClassName(primary: boolean, compact: boolean) {
  if (primary) {
    return compact
      ? 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-foreground text-background text-xs font-ui font-medium hover:opacity-90 transition-opacity'
      : 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-ui font-medium hover:opacity-90 transition-opacity';
  }

  return compact
    ? 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full border border-border text-xs font-ui text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-colors'
    : 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm font-ui text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-colors';
}

export default function GrowthActions({ language, context, compact = false, className = '' }: GrowthActionsProps) {
  const subscribeUrl = hasNewsletter ? siteConfig.buttondownUrl : `${siteConfig.siteUrl}/feed.xml`;
  const followLabel = language === 'zh' ? '在 X 上关注' : 'Follow on X';
  const subscribeLabel = hasNewsletter
    ? (language === 'zh' ? '邮件订阅' : 'Subscribe')
    : (language === 'zh' ? '订阅 RSS' : 'Follow via RSS');

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`.trim()}>
      <a
        href={siteConfig.xProfileUrl}
        target="_blank"
        rel="noreferrer"
        className={actionClassName(true, compact)}
        onClick={() => trackGrowthEvent('follow_on_x_click', { context })}
      >
        <span>{followLabel}</span>
        <span aria-hidden="true">↗</span>
      </a>

      <a
        href={subscribeUrl}
        target="_blank"
        rel="noreferrer"
        className={actionClassName(false, compact)}
        onClick={() => trackGrowthEvent('subscribe_click', { context, mode: hasNewsletter ? 'buttondown' : 'rss' })}
      >
        <span>{subscribeLabel}</span>
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
