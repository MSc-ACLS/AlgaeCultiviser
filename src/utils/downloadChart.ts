import html2canvas from 'html2canvas'
import { Dispatch } from 'redux'
import { setTheme } from '../theme/themeSlice'

export const handleDownloadChart = async (
  chartRef: React.RefObject<HTMLDivElement | null>, 
  filename: string,
  currentTheme: string,
  dispatch: Dispatch
) => {
  if (!chartRef.current) return 

  const isDarkMode = currentTheme === 'dark'

  if (isDarkMode) {
    dispatch(setTheme('light'))
    await new Promise((resolve) => setTimeout(resolve, 100)) 
  }
  
  const canvas = await html2canvas(chartRef.current, {
    scale: 3, 
    useCORS: true,
    backgroundColor: '#ffffff', 
  })

  if (isDarkMode) {
    dispatch(setTheme('dark'))
  }
  
  const dataURL = canvas.toDataURL('image/png')
  
  const link = document.createElement('a')
  link.href = dataURL
  link.download = filename
  link.click()
}