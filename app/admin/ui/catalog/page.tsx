import { AdminCatalog } from "../../../components/AdminUiPanels";
import { AdminUiShell, isStaticExport, requireAdminPage, StaticAdminNotice } from "../../../components/AdminUiShell";
import { recipeSources } from "../../../lib/ui-model";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";
export const metadata = { title: "组件清单", robots: { index: false, follow: false } };

export default async function UiCatalogPage() {
  if (isStaticExport()) return <StaticAdminNotice />;
  const user = await requireAdminPage();
  return (
    <AdminUiShell active="/admin/ui/catalog" userName={`@${user.login}`}>
      <AdminCatalog recipes={recipeSources} />
    </AdminUiShell>
  );
}
