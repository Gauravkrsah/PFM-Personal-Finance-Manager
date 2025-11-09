import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useToast } from './Toast'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const toast = useToast()

  useEffect(() => {
    // Check URL parameters for errors
    const urlParams = new URLSearchParams(window.location.hash.substring(1))
    const error = urlParams.get('error')
    const errorDescription = urlParams.get('error_description')
    
    if (error) {
      let message = 'An error occurred with the reset link.'
      if (error === 'access_denied' && errorDescription) {
        message = decodeURIComponent(errorDescription)
      }
      setErrorMessage(message)
      setIsValidSession(false)
      return
    }

    // Check if we have a valid password reset session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          setErrorMessage('Error checking session: ' + error.message)
          setIsValidSession(false)
        } else if (session?.user) {
          setIsValidSession(true)
        } else {
          setErrorMessage('Invalid or expired reset link. Please request a new password reset.')
          setIsValidSession(false)
        }
      } catch (err) {
        setErrorMessage('Error checking session. Please try again.')
        setIsValidSession(false)
      }
    }
    checkSession()
  }, [])

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) {
        toast.error('Error: ' + error.message)
      } else {
        toast.success('Password updated successfully! You can now sign in with your new password.')
        // Redirect to main app after a delay
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      }
    } catch (err) {
      toast.error('An error occurred while updating your password')
    }
    
    setLoading(false)
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Link Issue</h1>
            <p className="text-gray-600">There was an issue with your password reset link.</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 border text-center">
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">
                {errorMessage || 'This password reset link is invalid or has expired.'}
              </p>
            </div>
            <p className="text-gray-700 mb-4">
              Please request a new password reset from the sign-in page.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔑</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h1>
          <p className="text-gray-600">Enter your new password below</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 border">
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
                minLength={6}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
                minLength={6}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Updating...</span>
                </div>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => window.location.href = '/'}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
        
        <div className="text-center mt-6 text-sm text-gray-500">
          Secure • Private • Easy to use
        </div>
      </div>
    </div>
  )
}