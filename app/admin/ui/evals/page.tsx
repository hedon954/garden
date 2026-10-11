import { parse as parseYaml } from "yaml";
import casesSource from "../../../../ui/evals/cases.yaml?raw";
import { AdminEvals } from "../../../components/AdminUiPanels";
import { AdminUiShell, isStaticExport, requireAdminPage, StaticAdminNotice } from "../../../components/AdminUiShell";
import { modelConfig } from "../../../lib/ui-model";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";
export const metadata = { title: "模型自检", robots: { index: false, follow: false } };

export default async function UiEvalsPage() {
  if (isStaticExport()) return <StaticAdminNotice />;
  const user = await requireAdminPage();
  const cases = (parseYaml(casesSource) ?? []) as Array<{ id: string; intent: string; expect: { components?: string[]; assert?: boolean; note?: boolean } }>;
  return (
    <AdminUiShell active="/admin/ui/evals" userName={`@${user.login}`}>
      <AdminEvals cases={cases} configured={Boolean(modelConfig())} />
    </AdminUiShell>
  );
}
