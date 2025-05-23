import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

enum Environment {
  dev = 'dev',
  test = 'test',
  prod = 'prod',
}

const environment: Environment = (import.meta.env.VITE_APP_ENV as Environment) || Environment.dev

const baseUrl = (() => {
  switch (environment) {
    case Environment.dev:
      // 开发环境使用HTTPS
      return 'https://szrs.shikongai.com:7001/api'

    case Environment.test:
      // 测试环境使用HTTPS
      return 'https://szrs.shikongai.com:7001/api'

    case Environment.prod:
      // 生产环境使用HTTPS
      return 'https://szrs.shikongai.com:7001/api'

    default:
      // 默认情况下使用HTTPS
      return 'https://szrs.shikongai.com:7001/api'
  }
})()

const service: AxiosInstance = axios.create({
  baseURL: baseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 在这里可以添加 token 等认证信息
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response
    // 这里可以根据后端接口规范进行统一处理
    if (data.code === 200) {
      return data.data
    }
    console.error('API响应错误:', data.message || '请求失败', data)
    return Promise.reject(new Error(data.message || '请求失败'))
  },
  (error) => {
    // 这里可以处理 401、403 等错误
    console.error('API请求异常:', error)
    
    if (error.response?.status === 401) {
      // 处理未授权的情况，但不跳转到不存在的路由
      localStorage.removeItem('token')
      // 只有在存在/login路由时才跳转
      // window.location.href = '/login'
      console.error('未授权访问，已清除token')
    }
    return Promise.reject(error)
  }
)

export default service
