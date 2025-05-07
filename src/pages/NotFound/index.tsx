import React from 'react'
import { useNavigate } from 'react-router-dom'

const NotFound: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="flex-column" style={{ height: '100vh', padding: '0.2rem' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '0.4rem' }}>404 Not Found</h1>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '0.1rem',
          backgroundColor: '#1890ff',
          color: 'white',
          border: 'none',
          borderRadius: '0.04rem',
        }}
      >
        Back to Home
      </button>
    </div>
  )
}

export default NotFound 