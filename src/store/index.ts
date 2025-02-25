import { configureStore } from '@reduxjs/toolkit'
import dataReducer, { loadInitialData } from '../features/dataSlice'

const store = configureStore({
  reducer: {
    data: dataReducer,
  },
})

store.dispatch(loadInitialData())

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store