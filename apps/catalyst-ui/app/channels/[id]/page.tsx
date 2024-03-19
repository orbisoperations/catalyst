import { GeneralLayout } from "@/components/layouts";
import { OrbisProvider } from "@/components/utils";

export default function Home() {
  return (
    <OrbisProvider>
      <GeneralLayout title="Data Channels">Hello</GeneralLayout>
    </OrbisProvider>
  );
}
