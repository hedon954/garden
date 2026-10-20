import { ChatCircle, GithubLogo } from "@phosphor-icons/react/ssr";
import { readGiscusConfig } from "../lib/giscus-config";
import { GiscusComments } from "./GiscusComments";
import { ui } from "../lib/i18n";

export function Comments({ slug }: { slug: string }) {
  const config = readGiscusConfig();
  const t = ui();

  return (
    <section className="comments" aria-labelledby={`comments-heading-${slug}`}>
      <div className="comments-heading">
        <ChatCircle size={23} />
        <div>
          <h2 id={`comments-heading-${slug}`}>{t.comments}</h2>
          <p>
            {config ? t.commentsSummaryReady : t.commentsSummaryUnconfigured}
          </p>
        </div>
      </div>

      {config ? (
        <GiscusComments slug={slug} config={config} />
      ) : (
        <div className="integration-notice">
          <GithubLogo size={20} weight="fill" />
          <p>
            {t.commentsSetupBefore}{" "}
            <a href={t.commentsGiscusGuideUrl} target="_blank" rel="noreferrer">
              Giscus
            </a>
            {t.commentsSetupMiddle}
            <code>.env.local</code>
            {t.commentsSetupAnd}
            <code>GISCUS_REPO</code>
            {t.commentsSetupJoin}
            <code>GISCUS_REPO_ID</code>
            {t.commentsSetupJoin}
            <code>GISCUS_CATEGORY</code>
            {t.commentsSetupJoin}
            <code>GISCUS_CATEGORY_ID</code>
            {t.commentsSetupEnd}
          </p>
        </div>
      )}
    </section>
  );
}
