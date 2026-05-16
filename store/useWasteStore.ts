import { create } from 'zustand';

export interface Transaction {
  id: string;
  type: string;
  weight: number;
  reward: number;
  date: string;
  status: string;
}

export interface Withdrawal {
  id: string;
  method: string;
  accountName: string;
  accountNumber: string;
  amount: number;
  date: string;
  status: 'Menunggu Verifikasi' | 'Dikirim' | 'Ditolak';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
}

interface WasteStore {
  balance: number; // Saldo kotor belum dipotong pending
  transactions: Transaction[];
  withdrawals: Withdrawal[];
  notifications: AppNotification[];
  userExp: number;
  userTier: string;
  isHydrated: boolean;
  initStore: (balance: number, transactions: Transaction[], withdrawals: Withdrawal[]) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'status'>) => void;
  requestWithdrawal: (withdrawalRequest: Omit<Withdrawal, 'id' | 'status' | 'date'>) => boolean;
  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'date'>) => void;
  setNotifications: (notifications: AppNotification[]) => void;
  markNotificationsAsRead: () => void;
  setUserTier: (exp: number, tier: string) => void;
}

export const useWasteStore = create<WasteStore>()((set, get) => ({
      balance: 0,
      transactions: [],
      withdrawals: [],
      notifications: [],
      userExp: 0,
      userTier: 'bronze',
      isHydrated: false,
      initStore: (balance, transactions, withdrawals) => {
        set({ balance, transactions, withdrawals, isHydrated: true });
      },
      addTransaction: (transaction) => {
        const id = `TX-${Math.floor(1000 + Math.random() * 9000)}`;
        const newTx: Transaction = {
          ...transaction,
          id,
          status: 'pending', // Awaiting admin verification
        };

        const newNotification: AppNotification = {
          id: `NOTIF-${Date.now()}`,
          title: "Setoran Diajukan",
          message: `Setoran ${transaction.weight}kg ${transaction.type} telah diajukan. Menunggu verifikasi admin untuk penambahan saldo.`,
          date: new Date().toISOString(),
          read: false,
        };

        set((state) => ({
          transactions: [newTx, ...state.transactions],
          // Balance is NOT updated here; it's re-fetched from DB after verification
          notifications: [newNotification, ...state.notifications],
        }));
      },
      requestWithdrawal: (withdrawalRequest) => {
        const state = get();
        // Hitung total penarikan yang sedang pending atau sudah dikirim
        const totalPendingOrSent = state.withdrawals
          .filter(w => w.status !== 'Ditolak')
          .reduce((acc, w) => acc + w.amount, 0);

        // Saldo yang benar-benar bisa ditarik
        const availableBalance = state.balance - totalPendingOrSent;

        if (availableBalance >= withdrawalRequest.amount) {
          const newWithdrawal: Withdrawal = {
            ...withdrawalRequest,
            id: `WD-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString().split('T')[0],
            status: 'Menunggu Verifikasi', // saldo tidak langsung berkurang, masih pending
          };

          const newNotification: AppNotification = {
            id: `NOTIF-${Date.now()}`,
            title: "Penarikan Diajukan",
            message: `Dana Rp ${withdrawalRequest.amount.toLocaleString('id-ID')} sedang dimintakan ke ${withdrawalRequest.method.replace('_', ' ')}. Menunggu admin.`,
            date: new Date().toISOString(),
            read: false,
          };

          set((s) => ({
            withdrawals: [newWithdrawal, ...s.withdrawals],
            notifications: [newNotification, ...s.notifications]
          }));
          return true;
        }
        return false;
      },
      addNotification: (notification) => {
        set((s) => ({
          notifications: [{
            ...notification,
            id: `NOTIF-${Date.now()}`,
            date: new Date().toISOString(),
            read: false,
          }, ...s.notifications]
        }));
      },
      setNotifications: (notifications) => {
        set({ notifications })
      },
      markNotificationsAsRead: () => {
        set((s) => ({
          notifications: s.notifications.map(n => ({ ...n, read: true }))
        }));
      },
      setUserTier: (exp, tier) => {
        set({ userExp: exp, userTier: tier })
      }
  }));

// EXP-based tier system
export function useUserTier() {
  const exp = useWasteStore((state) => state.userExp);
  const storedTier = useWasteStore((state) => state.userTier);

  // Calculate tier based on EXP
  let tier = storedTier || "bronze";
  let bonusPercentage = 0;
  let expForNextTier = 1000;
  let tierColor = "text-amber-700 bg-amber-100 ring-amber-600/20"; // Bronze
  let tierBadge = "🥉";

  if (exp >= 5000) {
    tier = "gold";
    bonusPercentage = 10;
    expForNextTier = 0;
    tierColor = "text-yellow-700 bg-yellow-100 ring-yellow-600/20";
    tierBadge = "🥇";
  } else if (exp >= 1000) {
    tier = "silver";
    bonusPercentage = 3;
    expForNextTier = 5000;
    tierColor = "text-stone-600 bg-stone-200 ring-stone-600/20";
    tierBadge = "🥈";
  } else {
    tier = "bronze";
    bonusPercentage = 0;
    expForNextTier = 1000;
    tierColor = "text-amber-700 bg-amber-100 ring-amber-600/20";
    tierBadge = "🥉";
  }

  const progressToNext = expForNextTier > 0
    ? Math.min((exp / expForNextTier) * 100, 100)
    : 100;

  return {
    tier,
    exp,
    bonusPercentage,
    expForNextTier,
    progressToNext,
    tierColor,
    tierBadge
  };
}
