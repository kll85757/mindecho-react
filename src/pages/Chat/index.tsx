import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  TextField,
  Button,
  IconButton,
  Link
} from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import { useNavigate } from 'react-router-dom'
import WebSocketService from '../../utils/websocket'
import homeAiHead from '../../assets/home_ai_head.png'

interface Message {
  id: string
  content: string
  sender: '我' | 'AI'
  timestamp: number
}

const Chat: React.FC = () => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'greet-ai',
      content: '',
      sender: 'AI',
      timestamp: Date.now()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 记录已经收到过的 TTS 片段
  const ttsSegmentsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    WebSocketService.connect()

    WebSocketService.on('message', (data: any) => {
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
    })

    return () => {
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
      window.location.href = 'https://example.com/android-app-download'
    } else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      window.location.href = 'https://example.com/ios-app-download'
    } else {
      window.location.href = 'https://example.com/app-download'
    }
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F8F9FE' }}>
      {/* 顶部导航 */}
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'black', boxShadow: 'none', borderBottom: '1px solid #eee' }}>
        <Toolbar sx={{ justifyContent: 'center', position: 'relative' }}>
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>AI访谈</Typography>
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
          <IconButton
            onClick={() => navigate('/')}
            sx={{ position: 'absolute', left: 16, bgcolor: 'black', color: 'white', borderRadius: 2, width: 36, height: 36, '&:hover': { bgcolor: '#333' } }}
          >
            <ArrowBackIosNewIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* 消息列表 */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
      <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid #eee', display: 'flex', gap: 1 }}>
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
        <Button
          onClick={handleSend}
          disabled={!inputValue.trim()}
          variant="contained"
          sx={{ bgcolor: '#4B96F8', color: 'white', borderRadius: '24px', px: 3, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#3A75C4' }, '&.Mui-disabled': { bgcolor: '#E8E9ED', color: '#999' } }}
        >
          发送
        </Button>
      </Box>
    </Box>
  )
}

export default Chat
