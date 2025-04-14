import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toggleTheme } from '../theme/themeSlice'
import { selectTheme } from '../theme/selectors'
import { IconButton, Tooltip } from '@mui/material'
import ScienceTwoToneIcon from '@mui/icons-material/ScienceTwoTone'

import LightModeTwoToneIcon from '@mui/icons-material/LightModeTwoTone';
import DarkModeTwoToneIcon from '@mui/icons-material/DarkModeTwoTone';


const ThemeToggleButton: React.FC = () => {
  const dispatch = useDispatch()
  const theme = useSelector(selectTheme)

  const handleToggleTheme = () => {
    dispatch(toggleTheme())
  }

  return (
    <Tooltip title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Reaction`}>
        <IconButton edge='start' color='inherit' onClick={handleToggleTheme}>
            {theme === 'light' ? <DarkModeTwoToneIcon /> : <LightModeTwoToneIcon />}
        </IconButton>
    </Tooltip>
  )
}

export default ThemeToggleButton