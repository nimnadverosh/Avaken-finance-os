import { ScreenshotImportFlow } from "@/components/import/screenshot-import-flow";
import { PageHeader } from "@/components/pages/page-header";

export const metadata = {
  title: "Screenshot Import · Avaken Finance OS",
  description: "Import transactions from bank and app screenshots via Hermes Agent",
};

export default function ScreenshotImportPage() {
  return (
    <div>
      <PageHeader
        title="Screenshot import"
        description="Secure AI extraction via Hermes on your VPS · images never stored on Avaken"
      />
      <ScreenshotImportFlow />
    </div>
  );
}
