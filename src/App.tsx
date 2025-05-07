import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import service from './utils/request'
import './styles/global.less'

// 懒加载页面组件
const Home = lazy(() => import('./pages/Home'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'))
const Chat = lazy(() => import('./pages/Chat'))

function App() {
  useEffect(() => {
    const guestLogin = async () => {
      try {
        const response = await service.post('/auth/loginByGuest', {
          guest: '5555',
          userProfileId: '1911061390466269185',
        })
        if (response && response.data && response.data.token) {
          localStorage.setItem('token', response.data.token)
        }
      } catch (error) {
        console.error('Guest login failed:', error)
      }
    }
    guestLogin()
  }, [])

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex-center" style={{ height: '100vh' }}>Loading...</div>}>
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

export default App
