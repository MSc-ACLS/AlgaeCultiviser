import React from 'react'
import { useSelector } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, AppBar, Toolbar, IconButton, Typography, Tooltip, Box } from '@mui/material'
import CloudDownloadTwoToneIcon from '@mui/icons-material/CloudDownloadTwoTone'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import DataPage from './pages/DataPage'
import OptimisePage from './pages/OptimisePage'
import NavigationTabs from './components/NavigationTabs'
import { selectTheme, LIGHT_THEME, DARK_THEME } from './theme/selectors'
import ThemeToggleButton from './components/ThemeToggleButton'
import AnalyseTimeseries from './pages/AnalyseTimeseries'
import AnalyseCorrelations from './pages/AnalyseCorrelations'

const App: React.FC = () => {
  const themeMode = useSelector(selectTheme) // 'light' or 'dark'

  // Use pre-defined themes
  const theme = themeMode === 'light' ? LIGHT_THEME : DARK_THEME

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <CssBaseline />
        <AppBar elevation={3} position='sticky'>
          <Toolbar>
            <ThemeToggleButton />

            <Typography
              variant='h6'
              sx={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                fontWeight: 'bold',
              }}
            >
              AlgaeCultiviser
            </Typography>

            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title='Download Data'>
              <IconButton color='inherit'>
                <CloudDownloadTwoToneIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>

          <NavigationTabs />
        </AppBar>
        <Box
          sx={{
            mt: 3, // Margin at the top
            width: '100%',
            height: 'calc(100vh - 115px)', // Dynamically adjust height (AppBar + NavigationTabs = ~115px)
            margin: '0 auto',
            padding: 2, // Keep padding for consistent spacing
            boxSizing: 'border-box', // Ensure padding is included in the height calculation
            overflow: 'auto', // Allow scrolling if content overflows
          }}
        >
          <Routes>
            <Route path='/' element={<DataPage />} />
            <Route path='/analyse' element={<AnalyseTimeseries />} />
            <Route path='/analyse/correlations' element={<AnalyseCorrelations />} />
            <Route path='/optimise' element={<OptimisePage />} />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  )
}

export default App
