import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useToast } from './Toast'

export default function Header({ user, onLogout, onProfileUpdate, currentGroup, compact = false }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profile, setProfile] = useState({
    name: user?.user_metadata?.name || '',
    phone: user?.user_metadata?.phone || '',
    bio: user?.user_metadata?.bio || ''
  })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (user && !user.user_metadata?.name) {
      setIsEditingProfile(true)
    }
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  const updateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          name: profile.name,
          phone: profile.phone,
          bio: profile.bio
        }
      })
      
      if (profile.name && !metadataError) {
        await supabase.auth.updateUser({
          data: {
            display_name: profile.name,
            full_name: profile.name,
            name: profile.name,
            phone: profile.phone,
            bio: profile.bio
          }
        })
      }
      
      if (!metadataError) {
        setIsEditingProfile(false)
        setShowProfileMenu(false)
        onProfileUpdate?.(profile)
        toast.success('Profile updated')
        setTimeout(() => window.location.reload(), 500)
      } else {
        toast.error('Error: ' + metadataError.message)
      }
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
    setLoading(false)
  }

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <>
      {compact && (
        <div className="relative">
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-7 h-7 bg-black text-white flex items-center justify-center text-xs font-bold rounded hover:bg-gray-800 transition-colors">
            {userInitial}
          </button>
          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 top-10 lg:bottom-full lg:top-auto lg:mb-2 lg:left-0 lg:right-auto w-56 bg-white border border-gray-200 shadow-lg rounded-lg z-[70]">
                <div className="px-3 py-2 border-b border-gray-200">
                  <div className="font-medium text-sm truncate">{userName}</div>
                  <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                </div>
                <button onClick={() => { setIsEditingProfile(true); setShowProfileMenu(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Edit
                </button>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Edit Profile</h3>
              <button onClick={() => setIsEditingProfile(false)} className="text-gray-400 hover:text-black">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={updateProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="input-field" required autoFocus={!user?.user_metadata?.name} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Bio</label>
                <textarea value={profile.bio} onChange={(e) => setProfile({...profile, bio: e.target.value})} rows={3} className="input-field resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </>
  )
}
