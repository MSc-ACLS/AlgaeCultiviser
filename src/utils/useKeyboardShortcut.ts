import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { toggleTheme } from '../theme/themeSlice'

const useKeyboardShortcut = () => {
  const dispatch = useDispatch()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey

      if (isCtrlOrCmd && event.key.toLowerCase() === 'j') {
        event.preventDefault()
        dispatch(toggleTheme())
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [dispatch])
}

export default useKeyboardShortcut
