import DashboardNavigation from './DashboardNavigation';
import { UserButton } from '@clerk/nextjs';
import NotificationBell from './NotificationBell';
import { evaluateBadges } from '@/app/actions/badges';
import { getRewardsStatus } from '@/app/actions/rewards';
import BadgePopup from '@/app/components/BadgePopup';
import RewardToastAnnouncer from '@/app/components/RewardToastAnnouncer';
import { ChatWrapper } from '@/app/components/ChatWrapper';
import { SyncUserProvider } from '@/components/SyncUserProvider';
import { NotificationsProvider } from '@/components/NotificationsProvider';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const evaluateRes = await evaluateBadges();
  const newlyUnlocked = evaluateRes.success ? evaluateRes.badgesUnlocked : [];

  const rewardsRes = await getRewardsStatus();
  const claimableCount = rewardsRes.success ? rewardsRes.claimableCount : 0;

  return (
    <ChatWrapper>
      <div className="relative flex min-h-screen overflow-hidden bg-[#e4efe9]">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_36%),linear-gradient(180deg,#eef6f2_0%,#dceae4_45%,#edf6f2_100%)]" />
          <div className="absolute left-[-8rem] top-[4rem] h-[28rem] w-[28rem] rounded-full bg-emerald-300/25 blur-[120px]" />
          <div className="absolute bottom-[-8rem] right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-cyan-300/18 blur-[120px]" />
        </div>

        <DashboardNavigation claimableCount={claimableCount} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 hidden h-20 items-center justify-end px-6 py-4 md:flex md:px-8">
            <div className="glass-panel-soft flex items-center gap-4 rounded-[28px] px-5 py-3">
              <div className="rounded-full border border-emerald-100/80 bg-emerald-50/90 px-4 py-1 text-sm text-stone-700 shadow-sm">
                Status: <span className="font-bold text-emerald-700">Aktif</span>
              </div>
              <NotificationBell />
              <div className="h-6 w-px bg-stone-200/80" />
              <UserButton />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 md:p-8 md:pt-4">
            <SyncUserProvider>
            <NotificationsProvider>
            <div className="flex items-center gap-4">
              <div className="glass-shell mx-auto w-full max-w-7xl rounded-[34px] p-3 sm:p-4 md:p-5">
                {children}
              </div>
            </div>
            </NotificationsProvider>
          </SyncUserProvider>
          </main>
        </div>

        {newlyUnlocked && newlyUnlocked.length > 0 && <BadgePopup badges={newlyUnlocked} />}
        <RewardToastAnnouncer claimableCount={claimableCount ?? 0} />
      </div>
    </ChatWrapper>
  );
}