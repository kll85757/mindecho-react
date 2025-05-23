import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Box, 
  Typography, 
  Link, 
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  DialogTitle,
  AppBar,
  Toolbar
} from '@mui/material'
import service from '../../utils/request'

declare global {
  interface Window {
    MSStream?: any
  }
}

// API响应数据类型
interface ArticleResponse {
  id: string
  title: string
  simplyContent: string
  content?: string
  author: string
  date: string
  likes: number
  [key: string]: any // 允许其他属性
}

interface Article {
  id: string
  title: string
  simplyContent: string
  content?: string
  author: string
  date: string
  likes: number
}

const ArticleDetail: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const articleContainerRef = useRef<HTMLDivElement>(null)
  const hasTriggeredRef = useRef(false)
  // 追踪访客登录是否已执行
  const hasLoggedInRef = useRef<boolean>(false)

  // 从URL中解析参数
  const queryParams = new URLSearchParams(location.search)
  const prologue = queryParams.get('prologue')
  const userProfileId = queryParams.get('userProfileId')
  const articleId = queryParams.get('id')

  // 监听滚动事件
  useEffect(() => {
    // 获取文章容器元素
    const articleContainer = articleContainerRef.current;
    if (!articleContainer) return;

    const handleScroll = () => {
      if (hasTriggeredRef.current || !contentRef.current || !articleContainer) return;
      
      const scrollPosition = articleContainer.scrollTop;
      
      // 当文章内容区域滚动超过500px时显示弹窗
      if (scrollPosition > 500) {
        setShowDownloadDialog(true);
        hasTriggeredRef.current = true;
      }
    };

    // 监听文章容器的滚动事件，而不是window的滚动事件
    articleContainer.addEventListener('scroll', handleScroll);
    return () => articleContainer.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!prologue && !articleId) {
      console.log('没有找到prologue或articleId参数，展示空状态')
      setLoading(false)
      return
    }

    console.log('开始获取文章数据，参数:', { prologue, articleId, userProfileId })

    const fetchArticle = async () => {
      try {
        // 先执行访客登录获取token
        await guestLogin()
        
        // 根据参数获取文章数据
        const params: Record<string, string> = {}
        
        if (prologue) {
          params.prologue = prologue
        }
        
        if (articleId) {
          params.biographyId = articleId
        }
        
        if (userProfileId) {
          params.userProfileId = userProfileId
        }
        
        console.log('请求文章详情，参数:', params)
        
        try {
          const response = await service.get('/public/readSimplyBiography', { params }) as ArticleResponse
          console.log('文章详情响应:', response)
          
          if (response) {
            setArticle({
              id: response.id,
              title: response.title,
              simplyContent: response.simplyContent,
              content: response.content,
              author: response.author,
              date: response.date,
              likes: response.likes
            })
          } else {
            console.log('未获取到文章数据，使用默认内容')
            // 如果没有获取到数据，显示默认内容
            setArticle({
              id: 'default',
              title: 'AI生成内容',
              simplyContent: prologue || '',
              author: 'AI助手',
              date: new Date().toLocaleDateString(),
              likes: 0
            })
          }
        } catch (apiError) {
          console.error('API请求失败:', apiError)
          // API请求失败时显示默认内容
          setArticle({
            id: 'error',
            title: '内容生成',
            simplyContent: prologue || '未能获取内容',
            author: 'AI助手',
            date: new Date().toLocaleDateString(),
            likes: 0
          })
        }
      } catch (error) {
        console.error('整体获取文章流程失败:', error)
        // 失败时显示默认内容
        setArticle({
          id: 'error',
          title: '内容生成',
          simplyContent: prologue || '请稍后再试',
          author: 'AI助手',
          date: new Date().toLocaleDateString(),
          likes: 0
        })
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [prologue, userProfileId, articleId])

  const handleDownloadApp = () => {
    const userAgent = navigator.userAgent || navigator.vendor || ''
    if (/android/i.test(userAgent)) {
      // 安卓下载链接示例
      window.location.href = 'https://shikongai.com'
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      // iOS下载链接示例
      window.location.href = 'https://shikongai.com'
    } else {
      // 其他平台跳转到通用下载页
      window.location.href = 'https://shikongai.com'
    }
  }

  // 分享当前文章
  const handleShare = () => {
    if (!prologue && !articleId) return
    
    // 构建分享链接
    let shareUrl;
    if (prologue) {
      shareUrl = `https://szrs.shikongai.com/article?prologue=${encodeURIComponent(prologue)}${userProfileId ? `&userProfileId=${userProfileId}` : ''}`;
    } else {
      shareUrl = `https://szrs.shikongai.com/article?id=${articleId}${userProfileId ? `&userProfileId=${userProfileId}` : ''}`;
    }
    
    // 使用Web Share API
    if (navigator.share) {
      navigator.share({
        title: article?.title || 'AI内容分享',
        text: (article?.simplyContent ? article.simplyContent.substring(0, 100) + (article.simplyContent.length > 100 ? '...' : '') : '查看详情'),
        url: shareUrl
      }).catch(err => {
        console.error('分享失败:', err)
        // 失败时回退到复制链接
        copyShareLink(shareUrl)
      })
    } else {
      // 浏览器不支持分享API，直接复制链接
      copyShareLink(shareUrl)
    }
  }
  
  // 复制分享链接
  const copyShareLink = (link: string) => {
    navigator.clipboard.writeText(link)
      .then(() => alert('链接已复制到剪贴板'))
      .catch(() => alert('复制失败，请手动复制链接'))
  }

  // 访客登录获取token
  const guestLogin = async (): Promise<void> => {
    // 防止重复登录
    if (hasLoggedInRef.current) {
      console.log('Guest login already performed, skipping')
      return
    }
    
    hasLoggedInRef.current = true
    
    try {
      // 生成唯一访客标识
      const uuid = Math.random() + Date.now()
      
      console.log('正在执行访客登录请求...')
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
          console.log('文章页面获取的token:', token);
        } else {
          console.error('No token found in response object:', responseObj)
        }
      } else {
        console.error('Invalid response format:', response)
      }
    } catch (error) {
      console.error('Guest login failed:', error)
      // 登录失败时重置状态，允许重试
      hasLoggedInRef.current = false
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
        <Typography>内容未找到</Typography>
        <Box mt={2}>
          <button onClick={() => navigate('/')}>返回首页</button>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{
      height: '100vh',
      maxHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'white',
      overflow: 'hidden'
    }}>
      {/* 顶部导航 */}
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'black', boxShadow: 'none', borderBottom: 'none', pt: 1 }}>
        <Toolbar sx={{ justifyContent: 'center', position: 'relative' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '1.3rem', fontWeight: 'bold' }}>数字人生</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#888', mt: -0.5 }}>每个人的故事都值得被记录</Typography>
          </Box>
          <Link
            href="#"
            underline="none"
            sx={{
              position: 'absolute',
              right: 16,
              fontWeight: 'normal',
              color: '#9b8fff',
              cursor: 'pointer',
              fontSize: '1rem',
              userSelect: 'none'
            }}
            onClick={(e) => {
              e.preventDefault()
              handleDownloadApp()
            }}
          >
            下载app
          </Link>
        </Toolbar>
      </AppBar>
      
      {/* 文章内容区域 */}
      <Box 
        ref={articleContainerRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: 3,
          py: 2,
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }}
      >
        <Typography variant="h4" sx={{ 
          fontSize: '1.4rem', 
          fontWeight: 'bold', 
          mb: 3,
          color: '#333',
          lineHeight: 1.3,
          textAlign: 'center'
        }}>
          {article.title}
        </Typography>
        
        <div ref={contentRef} style={{ 
          lineHeight: 1.8, 
          whiteSpace: 'pre-wrap',
          fontSize: '1.1rem',
          fontWeight: 400,
          color: '#555',
          textAlign: 'justify'
        }}>
          {article.content || article.simplyContent}
        </div>
        
        <Box sx={{ height: '30px' }}></Box>
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
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" sx={{ textAlign: 'center', fontSize: '1.1rem', mb: 1 }}>
            您已阅读完朋友的传记<br/>
            快下载app来生成独属于<br/>
            自己的人生传记吧！
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3 }}>
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
              fontSize: '1rem',
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
              fontSize: '1rem',
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

export default ArticleDetail
