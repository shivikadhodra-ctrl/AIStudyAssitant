import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BookOpen, Sun, Moon, BarChart2, LayoutDashboard, LogOut, ChevronDown, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Navbar({ backTo, backLabel }) {
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const handleClick = () => setUserMenuOpen(false)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    setDark(isDark)
  }

  const handleLogout = () => {
    logout()
    toast.info('Signed out successfully')
    navigate('/auth')
  }

  const isActive = (path) => location.pathname === path

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Back button or logo */}
        {backTo ? (
          <button
            onClick={() => navigate(backTo)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{backLabel || 'Back'}</span>
          </button>
        ) : (
          <Link to="/dashboard" className="flex items-center gap-2 mr-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow shadow-indigo-500/20">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display text-base text-foreground">StudyAI</span>
          </Link>
        )}

        {/* Nav links (only show on non-study pages) */}
        {!backTo && (
          <nav className="flex items-center gap-1 ml-2">
            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive('/dashboard')
                  ? 'bg-indigo-500/10 text-indigo-500 font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <Link
              to="/analytics"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive('/analytics')
                  ? 'bg-indigo-500/10 text-indigo-500 font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Analytics
            </Link>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User menu */}
          {user && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setUserMenuOpen(p => !p) }}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-accent transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                  {initials}
                </div>
                <span className="text-sm text-foreground hidden sm:block max-w-[100px] truncate">
                  {user.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-xl py-1 animate-fade-in z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}