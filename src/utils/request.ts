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
      return 'http://182.92.107.224:7001/api'
    case Environment.test:
      return 'http://test-api.mindecho.com/api'
    case Environment.prod:
      return 'https://api.mindecho.com/api'
    default:
      return 'http://182.92.107.224:7000'
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
    return Promise.reject(new Error(data.message || '请求失败'))
  },
  (error) => {
    // 这里可以处理 401、403 等错误
    if (error.response?.status === 401) {
      // 处理未授权的情况
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default service
