import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Tabs, Tab, Box, useTheme } from '@mui/material'

const NavigationTabs: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme() // Access the current theme

  // Define tab mapping for routes
  const tabMapping: { [key: string]: number } = {
    '/': 0,
    '/analyse': 1,
    '/analyse/correlations': 1,
    '/optimise': 2,
  }

  const [selectedTab, setSelectedTab] = useState(tabMapping[location.pathname] ?? 0)

  useEffect(() => {
    setSelectedTab(tabMapping[location.pathname] ?? 0)
  }, [location.pathname])

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue)
    const paths = ['/', '/analyse', '/optimise']
    navigate(paths[newValue])
  }

  return (
    <Box
      sx={{
        width: '100%',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Tabs value={selectedTab} onChange={handleChange} centered>
        <Tab label="Data" />
        <Tab label="Analyse" />
        <Tab label="Optimise" />
      </Tabs>
    </Box>
  )
}

export default NavigationTabs
