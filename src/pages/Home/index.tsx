import React from 'react'
import WebSocketTester from '../../components/WebSocketTester'
import { Box, Typography } from '@mui/material'

const Home: React.FC = () => {
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
      bgcolor: '#f5f7fa'
    }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 'bold' }}>
        MindEcho 聊天测试
      </Typography>
      
      <WebSocketTester />
    </Box>
  )
}

export default Home