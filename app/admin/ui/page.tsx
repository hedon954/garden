import { AdminUiShell, isStaticExport, requireAdminPage, StaticAdminNotice } from "../../components/AdminUiShell";
import { UiStudio } from "../../components/UiStudio";
import { modelConfig, recipeSources, remainingDrafts } from "../../lib/ui-model";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";
export const metadata = { title: "组件工作台", robots: { index: false, follow: false } };

export default async function UiStudioPage() {
  if (isStaticExport()) return <StaticAdminNotice />;
  const user = await requireAdminPage();
  const config = modelConfig();
  return (
    <AdminUiShell active="/admin/ui" userName={`@${user.login}`}>
      <UiStudio
        configured={Boolean(config)}
        modelName={config?.model ?? null}
        remaining={remainingDrafts(user.login)}
        recipes={recipeSources}
      />
    </AdminUiShell>
  );
}
