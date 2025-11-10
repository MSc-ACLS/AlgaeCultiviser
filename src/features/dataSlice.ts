import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit"
import Papa from 'papaparse'
import { parseDataset } from '../utils/parseDataset'

export type DatasetType = 'zhaw' | 'agroscope'
export interface Dataset {
  id: number
  filename: string
  type: DatasetType
  data: any[]
  metadata?: {
    id: number
    filename: string
    data: any[]
  }
}

interface DataState {
  datasets: Dataset[]
  selectedDatasetId: number | null
}

const initialState: DataState = {
  datasets: [],
  selectedDatasetId: null
}

const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    addDataset: (state, action: PayloadAction<Dataset>) => {
      const existingDatasetIndex = state.datasets.findIndex(
        (dataset) => dataset.filename === action.payload.filename
      )

      if (existingDatasetIndex !== -1) {
        state.datasets[existingDatasetIndex] = {
          ...state.datasets[existingDatasetIndex],
          ...action.payload,
        }
      } else {
        state.datasets.push(action.payload)
      }
    },
    removeDataset: (state, action: PayloadAction<number>) => {
      state.datasets = state.datasets.filter(dataset => dataset.id !== action.payload)
    },
    setSelectedDatasetId: (state, action: PayloadAction<number|null>) => {
      state.selectedDatasetId = action.payload
    },
  },
})

export const { addDataset, removeDataset, setSelectedDatasetId } = dataSlice.actions

export const dataReducer = dataSlice.reducer
export default dataReducer