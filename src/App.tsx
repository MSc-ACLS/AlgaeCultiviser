import React from 'react'
import { useSelector } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, AppBar, Toolbar, IconButton, Typography, Tooltip, Box } from '@mui/material'
import CloudDownloadTwoToneIcon from '@mui/icons-material/CloudDownloadTwoTone'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Data from './pages/Data'
import Optimise from './pages/Optimise'
import NavigationTabs from './components/NavigationTabs'
import { selectTheme, LIGHT_THEME, DARK_THEME } from './theme/selectors'
import ThemeToggleButton from './components/ThemeToggleButton'
import AnalyseTimeseries from './pages/AnalyseTimeseries'
import AnalyseCorrelations from './pages/AnalyseCorrelations'
import useKeyboardShortcut from './utils/useKeyboardShortcut'
import favi from './favi.svg'

const App: React.FC = () => {
  const themeMode = useSelector(selectTheme)

  useKeyboardShortcut()

  const theme = themeMode === 'light' ? LIGHT_THEME : DARK_THEME

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router basename='/AlgaeCultiviser'>
        <CssBaseline />
        <AppBar elevation={3} position='sticky'>
          <Toolbar>
            <ThemeToggleButton />

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <img
                src={favi}
                alt='Logo'
                style={{
                  width: '65px',
                  height: '65px',
                  marginRight: '8px',
                }}
              />
              <Typography
                variant='h6'
                sx={{
                  fontWeight: 'bold',
                }}
              >
                AlgaeCultiviser
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />
            {/* <Tooltip title='Download Data'>
              <IconButton color='inherit' disabled>
                <CloudDownloadTwoToneIcon />
              </IconButton>
            </Tooltip> */}
          </Toolbar>

          <NavigationTabs />
        </AppBar>
        <Box
          sx={{
            mt: 3,
            width: '100%',
            height: 'calc(100vh - 115px)',
            margin: '0 auto',
            padding: 2,
            boxSizing: 'border-box',
            overflow: 'auto',
          }}
        >
          <Routes>
            <Route path='/' element={<Data />} />
            <Route path='/analyse' element={<AnalyseTimeseries />} />
            <Route path='/analyse/correlations' element={<AnalyseCorrelations />} />
            <Route path='/optimise' element={<Optimise />} />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  )
}

export default App
