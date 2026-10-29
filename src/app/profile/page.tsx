import { ProfileForm } from "@/components/profile/ProfileForm";
import { AvatarUploader } from "@/components/profile/AvatarUploader";

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-2xl font-semibold text-brand-700">Profile</h1>
      <AvatarUploader />
        <ProfileForm />
    </main>
  );
}
