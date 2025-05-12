import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit"
import Papa from 'papaparse'
import { parseDataset } from '../utils/parseDataset'

export interface Dataset {
  id: number
  filename: string
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

export const loadInitialData = createAsyncThunk('data/loadInitialData', async () => {
  const response = await fetch('/data/dataagro24_run1.csv')
  const fileContent = await response.text()
  let parsedData: any[] = []
  Papa.parse(fileContent, {
    complete: (result) => {
      parsedData = result.data as any[]
    },
    header: false,
  })

  const parsedDataset = parseDataset(parsedData, 'dd.MM.yyyy HH:mm:ss.SSS')

  return [{
    id: 0,
    data: parsedDataset,
    filename: 'dataagro24_run1.csv'
  }]
})

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
  extraReducers: (builder) => {
    builder.addCase(loadInitialData.fulfilled, (state, action) => {
      state.datasets = action.payload
    })
  }
})

export const { addDataset, removeDataset, setSelectedDatasetId } = dataSlice.actions

export const dataReducer = dataSlice.reducer
export default dataReducer