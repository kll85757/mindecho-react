// App.tsx
import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import service from './utils/request'
import './styles/global.less'

// 懒加载页面组件
const Home = lazy(() => import('./pages/Home'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'))
const Chat = lazy(() => import('./pages/Chat'))

// 全局唯一的 guest 标识
const uuid = Math.random() + Date.now()

// 模块级标志，保证 guestLogin 只执行一次
let hasLoggedIn = false

async function guestLogin() {
  try {
    const response = await service.post('/auth/loginByGuest', {
      guest: `${uuid}`,
      userProfileId: '1905822448827469825',
    })
    if (response?.data?.token) {
      // 如果需要用到 token，保留下面一行；否则可删
      localStorage.setItem('token', response.data.token)
    }
  } catch (error) {
    console.error('Guest login failed:', error)
  }
}

export default function App() {
  useEffect(() => {
    if (!hasLoggedIn) {
      hasLoggedIn = true
      guestLogin()
    }
  }, [])

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex-center" style={{ height: '100vh' }}>
            Loading...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/article" element={<ArticleDetail />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
