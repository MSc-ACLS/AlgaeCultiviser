import { RootState } from '../store'
import { createSelector } from '@reduxjs/toolkit'
import { createTheme } from '@mui/material'

export const LIGHT_THEME = createTheme({
  palette: {
    mode: 'light',
    primary: { main: "#00796B" },
    secondary: { main: "#C0E218" },
  },
})

export const DARK_THEME = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: "#00796B" },
    secondary: { main: "#C0E218" },
  },
})

export const selectTheme = (s: RootState) => s.theme

export const selectCustomTheme = createSelector(selectTheme, (theme) => (theme === 'light' ? LIGHT_THEME : DARK_THEME))