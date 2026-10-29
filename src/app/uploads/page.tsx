import { UploadsManager } from "@/components/uploads/UploadsManager";

export const metadata = { title: "Uploads" };

export default function UploadsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <UploadsManager />
    </main>
  );
}
