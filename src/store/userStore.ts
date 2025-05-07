import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  token: string | null
  userInfo: any | null
  setToken: (token: string | null) => void
  setUserInfo: (userInfo: any) => void
  clearUser: () => void
}

const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      token: null,
      userInfo: null,
      setToken: (token) => set({ token }),
      setUserInfo: (userInfo) => set({ userInfo }),
      clearUser: () => set({ token: null, userInfo: null }),
    }),
    {
      name: 'user-storage',
    }
  )
)

export default useUserStore 