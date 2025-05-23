import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  TextField,
  Button,
  IconButton,
  Link,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle
} from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import { useNavigate, useLocation } from 'react-router-dom'
import WebSocketService from '../../utils/websocket'
import homeAiHead from '../../assets/home_ai_head.png'
import iconAiMic from '../../assets/icon_ai_mic.png'
import iconAiPhone from '../../assets/icon_ai_phone.png'
import service from '../../utils/request'

interface Message {
  id: string
  content: string
  sender: '我' | 'AI'
  timestamp: number
}

const Chat: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'greet-ai',
      content: '',
      sender: 'AI',
      timestamp: Date.now()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  // 从URL中获取标题
  const [title, setTitle] = useState<string>('AI访谈')

  // 记录已经收到过的 TTS 片段
  const ttsSegmentsRef = useRef<Set<string>>(new Set())
  // 追踪访客登录是否已执行
  const hasLoggedInRef = useRef<boolean>(false)

  useEffect(() => {
    // 从URL中获取userProfileId、openWords和title
    const params = new URLSearchParams(location.search)
    const userProfileId = params.get('userProfileId') || ''
    const openWords = params.get('openWords') || ''
    const urlTitle = params.get('title') || 'AI访谈'
    
    // 设置页面标题
    setTitle(decodeURIComponent(urlTitle))

    // 访客登录获取token
    const guestLogin = async () => {
      // 防止重复登录
      if (hasLoggedInRef.current) {
        console.log('Guest login already performed, skipping')
        return
      }
      
      hasLoggedInRef.current = true
      
      try {
        // 生成唯一访客标识
        const uuid = Math.random() + Date.now()
        
        const response = await service.post('/auth/loginByGuest', {
          guest: `${uuid}`,
          userProfileId: userProfileId || '1905822448827469825',
        })
        
        // 使用类型断言处理API响应
        console.log("Guest login response:", response)
        
        // 从响应中提取token并保存到localStorage
        if (response && typeof response === 'object') {
          // response可能直接是数据对象，因为axios拦截器已经提取了data.data
          const responseObj = response as any;
          const token = responseObj.token;
          if (token) {
            localStorage.setItem('token', token);
            console.log('接口获取的token:', token);
          } else {
            console.error('No token found in response object:', responseObj)
          }
        } else {
          console.error('Invalid response format:', response)
        }
        
        // 在WebSocket连接前打印将要使用的token
        const wsToken = localStorage.getItem('token');
        console.log('WebSocket将使用的token:', wsToken);
        
        // 访客登录成功后，初始化WebSocket连接
        // WebSocketService会从localStorage读取token
        WebSocketService.connect()
      } catch (error) {
        console.error('Guest login failed:', error)
        setConnectionStatus('disconnected')
        // 登录失败时重置状态，允许重试
        hasLoggedInRef.current = false
      }
    }

    // 执行访客登录
    guestLogin()

    // 订阅WebSocket事件
    const onMessage = (data: any) => {
      if (data.action === 'PUSH_TTS_STREAM_TEXT') {
        const segment = data.data.content

        // 如果已处理过同样的片段，则跳过
        if (ttsSegmentsRef.current.has(segment)) {
          return
        }
        ttsSegmentsRef.current.add(segment)
 
        // 将新片段追加到最后一条 AI 消息
        setMessages(prev => {
          const last = prev[prev.length - 1]
          if (last && last.sender === 'AI') {
            const merged = { ...last, content: last.content + segment }
            return [...prev.slice(0, -1), merged]
          }
          // 如果最后一条不是 AI，就新建一条
          return [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              content: segment,
              sender: 'AI',
              timestamp: Date.now()
            }
          ]
        })
      }
      else {
        // 收到其他类型消息时，先清空片段记录，为下一轮 TTS 做准备
        ttsSegmentsRef.current.clear()

        if (data.action === 'C2S_SAY_TEXT') {
          setMessages(prev => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              content: data.data,
              sender: 'AI',
              timestamp: Date.now()
            }
          ])
        }
        // 如果还有别的 action，也可以在这继续分支处理…
      }
    }

    const onConnect = () => {
      console.log('WebSocket connected')
      setConnectionStatus('connected')
    }

    const onDisconnect = () => {
      console.log('WebSocket disconnected')
      setConnectionStatus('disconnected')
    }

    const onError = (error: any) => {
      console.error('WebSocket error:', error)
      setConnectionStatus('disconnected')
    }

    WebSocketService.on('message', onMessage)
    WebSocketService.on('connect', onConnect)
    WebSocketService.on('disconnect', onDisconnect)
    WebSocketService.on('error', onError)

    return () => {
      WebSocketService.off('message', onMessage)
      WebSocketService.off('connect', onConnect)
      WebSocketService.off('disconnect', onDisconnect)
      WebSocketService.off('error', onError)
      WebSocketService.disconnect()
    }
  }, [])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const handleSend = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: `me-${Date.now()}`,
      content: inputValue,
      sender: '我',
      timestamp: Date.now()
    }

    WebSocketService.sendSayText(newMessage.content)
    setMessages(prev => [...prev, newMessage])
    setInputValue('')
  }

  // 下载 App
  const handleDownloadApp = () => {
    const ua = navigator.userAgent || navigator.vendor || ''
    if (/android/i.test(ua)) {
      window.location.href = 'https://shikongai.com'
    } else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      window.location.href = 'https://shikongai.com'
    } else {
      window.location.href = 'https://shikongai.com'
    }
  }

  // 重连WebSocket
  const handleReconnect = () => {
    setConnectionStatus('connecting')
    WebSocketService.disconnect()
    WebSocketService.connect()
  }

  // 显示下载提示弹窗
  const handleShowDownloadDialog = () => {
    setShowDownloadDialog(true)
  }

  // 处理麦克风按钮点击
  const handleMicClick = () => {
    handleShowDownloadDialog()
  }

  // 处理电话按钮点击
  const handlePhoneClick = () => {
    handleShowDownloadDialog()
  }

  // 是否显示发送按钮（输入框有内容时显示）
  const showSendButton = inputValue.trim().length > 0

  return (
    <Box
      sx={{
        height: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#F8F9FE',
        overflow: 'hidden'
      }}
    >
      {/* 顶部导航 */}
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'black', boxShadow: 'none', borderBottom: '1px solid #eee' }}>
        <Toolbar sx={{ justifyContent: 'center', position: 'relative' }}>
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>{title}</Typography>
          <Link
            href="#"
            underline="none"
            sx={{
              position: 'absolute',
              right: 16,
              fontWeight: 'normal',
              background: 'linear-gradient(90deg,#9b8fff,#b19aff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              userSelect: 'none'
            }}
            onClick={e => { e.preventDefault(); handleDownloadApp() }}
          >
            下载App
          </Link>
          {/* <IconButton
            onClick={() => navigate('/')}
            sx={{ position: 'absolute', left: 16, bgcolor: 'black', color: 'white', borderRadius: 2, width: 36, height: 36, '&:hover': { bgcolor: '#333' } }}
          >
            <ArrowBackIosNewIcon />
          </IconButton> */}
        </Toolbar>
      </AppBar>

      {/* 连接状态提示 */}
      {connectionStatus !== 'connected' && (
        <Box
          sx={{
            padding: 1,
            bgcolor: connectionStatus === 'connecting' ? '#FFF3CD' : '#F8D7DA',
            color: connectionStatus === 'connecting' ? '#856404' : '#721C24',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Typography variant="body2">
            {connectionStatus === 'connecting' ? '正在连接服务器...' : '本日聊天已达上限'}
          </Typography>
          {connectionStatus === 'disconnected' && (
            ""
            // <Button 
            //   size="small" 
            //   variant="outlined" 
            //   onClick={handleReconnect}
            //   sx={{ 
            //     color: '#721C24', 
            //     borderColor: '#721C24',
            //     '&:hover': {
            //       borderColor: '#721C24',
            //       bgcolor: 'rgba(114, 28, 36, 0.1)'
            //     }
            //   }}
            // >
            //   重新连接
            // </Button>
          )}
        </Box>
      )}

      {/* 消息列表 */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }}
      >
        {messages.map(msg => (
          <Box
            key={msg.id}
            sx={{ display: 'flex', justifyContent: msg.sender === '我' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 1 }}
          >
            {msg.sender === 'AI' ? (
              <>
                <Box component="img" src={homeAiHead} alt="AI" sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#E8E9ED' }} />
                <Box sx={{ maxWidth: '70%', p: 2, bgcolor: 'white', color: 'black', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <Typography variant="body1">{msg.content}</Typography>
                </Box>
              </>
            ) : (
              <>
                <Box sx={{ maxWidth: '70%', p: 2, bgcolor: '#4B96F8', color: 'white', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <Typography variant="body1">{msg.content}</Typography>
                </Box>
                <AccountCircleIcon sx={{ fontSize: 36, color: '#4B96F8' }} />
              </>
            )}
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* 输入框 */}
      <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid #eee', display: 'flex', gap: 1, alignItems: 'center' }}>
        {/* 麦克风按钮，仅在没有输入时显示 */}
        {!showSendButton && (
          <IconButton
            onClick={handleMicClick}
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: '#F8F9FE',
              '&:hover': { bgcolor: '#E8E9ED' }
            }}
          >
            <Box
              component="img"
              src={iconAiMic}
              alt="麦克风"
              sx={{ width: 24, height: 24 }}
            />
          </IconButton>
        )}

        <TextField
          fullWidth
          placeholder="输入消息…"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          variant="outlined"
          size="small"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '24px', bgcolor: '#F8F9FE' } }}
        />

        {/* 电话按钮，仅在没有输入时显示 */}
        {!showSendButton && (
          <IconButton
            onClick={handlePhoneClick}
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: '#F8F9FE',
              '&:hover': { bgcolor: '#E8E9ED' }
            }}
          >
            <Box
              component="img"
              src={iconAiPhone}
              alt="电话"
              sx={{ width: 24, height: 24 }}
            />
          </IconButton>
        )}

        {/* 发送按钮，仅在有输入内容时显示 */}
        {showSendButton && (
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || connectionStatus !== 'connected'}
            variant="contained"
            sx={{ bgcolor: '#4B96F8', color: 'white', borderRadius: '24px', px: 3, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#3A75C4' }, '&.Mui-disabled': { bgcolor: '#E8E9ED', color: '#999' } }}
          >
            发送
          </Button>
        )}
      </Box>

      {/* 下载APP提示弹窗 */}
      <Dialog
        open={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: '24px',
            maxWidth: '85%',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          {/* 提示 */}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ textAlign: 'center' }}>
            您已达会话体验次数上限 快来下载产品体验吧！
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            onClick={() => setShowDownloadDialog(false)}
            variant="outlined"
            sx={{
              boxSizing: 'border-box',
              position: 'relative',
              background: '#F3F6FF',
              color: '#666',
              borderRadius: '20px',
              px: 4,
              height: '40px',
              border: 'none',
              '&:hover': {
                borderColor: 'transparent',
                background: '#E8ECFF'
              }
            }}
          >
            我再想想
          </Button>
          <Button
            onClick={() => {
              setShowDownloadDialog(false)
              handleDownloadApp()
            }}
            variant="contained"
            sx={{
              position: 'relative',
              background: 'linear-gradient(90deg, #6DA5FB 0%, #4E6DF9 39.24%, #D56AF4 99.35%)',
              color: 'white',
              borderRadius: '20px',
              px: 4,
              height: '40px',
              boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
              border: 'none',
              '&:hover': { 
                opacity: 0.9,
                background: 'linear-gradient(90deg, #6DA5FB 0%, #4E6DF9 39.24%, #D56AF4 99.35%)'
              }
            }}
          >
            立即下载
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Chat
