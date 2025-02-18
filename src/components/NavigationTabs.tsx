import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Tabs, Tab, Box } from '@mui/material'

const NavigationTabs: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Define tab mapping for routes
  const tabMapping: { [key: string]: number } = {
    '/': 0,
    '/analyse': 1,
    '/optimise': 2
  }

  const [selectedTab, setSelectedTab] = useState(tabMapping[location.pathname] ?? 0)

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue)
    const paths = ['/', '/analyse', '/optimise']
    navigate(paths[newValue])
  }

  return (
    <Box sx={{ backgroundColor: 'white', width: '100%' }}>
      <Tabs value={selectedTab} onChange={handleChange} centered>
        <Tab label='Data' />
        <Tab label='Analyse' />
        <Tab label='Optimise' />
      </Tabs>
    </Box>
  )
}

export default NavigationTabs
