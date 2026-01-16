// API Configuration - Using localhost backend
export const API_BASE_URL = (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL) || ''

export default { baseURL: API_BASE_URL }