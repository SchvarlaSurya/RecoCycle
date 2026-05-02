import { UserProfile } from "@clerk/nextjs";
import ProfileForm from "./ProfileForm";
import { getUserProfileInfo, type UserProfileInfo } from "@/app/actions/profile";

export default async function PengaturanPage() {
  const profileRes = await getUserProfileInfo();
  const initialData: UserProfileInfo = profileRes.success
    ? profileRes.data
    : { phoneNumber: "", address: "", latitude: -6.2088, longitude: 106.8456 };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-12">
      <header className="glass-panel flex flex-col gap-1 rounded-[30px] px-5 py-4 sm:px-7 sm:py-5">
        <h1 className="text-2xl font-semibold text-stone-900">Pengaturan Akun</h1>
        <p className="text-sm text-stone-700">Kelola informasi pribadi, alamat penjemputan, dan tata kelola platform Anda.</p>
      </header>
      
      <ProfileForm initialData={initialData} />

      <div className="border-t border-white/60 pt-4">
        <h2 className="text-xl font-bold mb-6 text-stone-900">Keamanan & Login</h2>
        <section className="glass-panel flex flex-col overflow-hidden rounded-[30px] p-2">
          <UserProfile 
            routing="hash"
            appearance={{
              elements: {
                cardBox: "w-full max-w-full rounded-[24px] border border-white/60 bg-white/78 shadow-none",
              }
            }}
          />
        </section>
      </div>
    </div>
  );
}
