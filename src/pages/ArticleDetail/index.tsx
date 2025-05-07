import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, Typography, Link } from '@mui/material'

declare global {
  interface Window {
    MSStream?: any
  }
}

interface Article {
  id: string
  title: string
  simplyContent: string
  author: string
  date: string
  likes: number
}

const ArticleDetail: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)

  // Parse biographyId from URL query params
  const queryParams = new URLSearchParams(location.search)
  const biographyId = queryParams.get('biographyId')

  useEffect(() => {
    if (!biographyId) {
      setLoading(false)
      return
    }
    const fetchArticle = async () => {
      try {
        const response = await fetch(`/biography/readBiography?biographyId=${biographyId}`)
        const data = await response.json()
        if (data && data.code === 200 && data.data) {
          setArticle(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch article:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchArticle()
  }, [biographyId])

  const handleDownloadApp = () => {
    const userAgent = navigator.userAgent || navigator.vendor || ''
    if (/android/i.test(userAgent)) {
      // 安卓下载链接示例
      window.location.href = 'https://example.com/android-app-download'
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      // iOS下载链接示例
      window.location.href = 'https://example.com/ios-app-download'
    } else {
      // 其他平台跳转到通用下载页
      window.location.href = 'https://example.com/app-download'
    }
  }

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography>加载中...</Typography>
      </Box>
    )
  }

  if (!article) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>文章未找到</Typography>
        <Box mt={2}>
          <button onClick={() => navigate('/')}>返回首页</button>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ bgcolor: '#F8F9FE', minHeight: '100vh', padding: '0.2rem' }}>
      <Box sx={{ marginBottom: '0.2rem', position: 'relative' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '0.1rem 0.2rem',
            backgroundColor: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '0.04rem',
          }}
        >
          返回首页
        </button>
        <Link
          href="#"
          underline="none"
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            fontWeight: 'normal',
            background: 'linear-gradient(90deg, #9b8fff, #b19aff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            cursor: 'pointer',
            fontSize: '1rem',
            userSelect: 'none',
          }}
          onClick={(e) => {
            e.preventDefault()
            handleDownloadApp()
          }}
        >
          下载App
        </Link>
      </Box>
      <h1 style={{ marginBottom: '0.2rem' }}>{article.title}</h1>
      <div className="flex-between" style={{ marginBottom: '0.2rem', color: '#666' }}>
        <span>{article.author}</span>
        <span>{article.date}</span>
        <span>❤️ {article.likes}</span>
      </div>
      <div style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
        {article.simplyContent}
      </div>
    </Box>
  )
}

export default ArticleDetail
