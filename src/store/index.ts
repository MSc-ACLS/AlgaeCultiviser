import { configureStore } from '@reduxjs/toolkit'
import dataReducer from '../features/dataSlice'
import { themeReducer } from '../theme/themeSlice'

const store = configureStore({
  reducer: {
    data: dataReducer,
    theme: themeReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store