import { configureStore } from '@reduxjs/toolkit'
import dataReducer from '../features/dataSlice'

export const store = configureStore({
  reducer: {
    data: dataReducer,
  },
})

// Define RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
