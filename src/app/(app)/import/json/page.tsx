import { JsonImportForm } from "@/components/import/json-import-form";
import { PageHeader } from "@/components/pages/page-header";

export const metadata = {
  title: "JSON Import · Avaken Finance OS",
  description: "Import Hermes analyze JSON into Finance OS",
};

export default function JsonImportPage() {
  return (
    <div>
      <PageHeader
        title="JSON import"
        description="Paste Hermes analyze output or POST the same payload from your VPS"
      />
      <JsonImportForm />
    </div>
  );
}
