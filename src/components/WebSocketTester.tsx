import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Card, CardContent, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getWebSocketUrlParam } from '../App';
import service from '../utils/request';

const WebSocketTester: React.FC = () => {
  const navigate = useNavigate();
  const [wsUrl, setWsUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [baseWsUrl, setBaseWsUrl] = useState('wss://szrs.shikongai.com:7001/api/ws');

  // 组件加载时获取token
  useEffect(() => {
    fetchGuestToken();
  }, []);

  // 访客登录获取token
  const fetchGuestToken = async () => {
    setIsLoading(true);
    try {
      // 生成唯一访客标识
      const uuid = Math.random() + Date.now();
      
      const response = await service.post('/auth/loginByGuest', {
        guest: `${uuid}`,
        userProfileId: '1905822448827469825',
      });
      
      console.log("Guest login response:", response);
      
      // 获取token并更新WebSocket URL
      if (response && typeof response === 'object') {
        // 使用类型断言处理响应
        const responseData = response as any;
        if (responseData.token) {
          const tokenUrl = `${baseWsUrl}?token=${responseData.token}`;
          setWsUrl(tokenUrl);
          console.log("WebSocket URL with token:", tokenUrl);
        } else {
          console.error('Token not found in response');
          setWsUrl(baseWsUrl);
        }
      } else {
        console.error('Failed to get token from response');
        // 如果获取失败，使用默认URL
        setWsUrl(baseWsUrl);
      }
    } catch (error) {
      console.error('Guest login failed:', error);
      // 如果获取失败，使用默认URL
      setWsUrl(baseWsUrl);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    if (!wsUrl.trim()) {
      alert('请输入WebSocket URL');
      return;
    }
    
    // 导航到聊天页面并传递WebSocket URL
    navigate(`/chat?${getWebSocketUrlParam(wsUrl)}`);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ 
        width: '100%', 
        maxWidth: 600, 
        margin: '0 auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        borderRadius: 2
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
            WebSocket连接测试
          </Typography>
          
          <TextField
            label="WebSocket URL"
            fullWidth
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
            margin="normal"
            variant="outlined"
            placeholder="输入WebSocket URL"
            sx={{ mb: 2 }}
            disabled={isLoading}
          />
          
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Button 
              fullWidth 
              variant="contained" 
              color="primary" 
              onClick={handleConnect}
              sx={{ 
                height: 48, 
                borderRadius: '24px',
                bgcolor: '#4B96F8',
                '&:hover': {
                  bgcolor: '#3A75C4'
                }
              }}
            >
              连接并进入聊天
            </Button>
          )}
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              已自动获取访客登录token，可以直接点击"连接并进入聊天"测试
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default WebSocketTester; 