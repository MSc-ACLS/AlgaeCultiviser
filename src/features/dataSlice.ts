import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit"
import Papa from 'papaparse'
import { parseDataset } from '../utils/parseDataset'

interface Dataset {
  id: number
  data: any[] // The dataset content
  filename: string // The filename of the dataset
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
  const response = await fetch('/data/datazhaw100.csv')
  const fileContent = await response.text()
  let parsedData: any[] = []
  Papa.parse(fileContent, {
    complete: (result) => {
      parsedData = result.data as any[]
    },
    header: false,
  })

  // Apply parseDataset to ensure the data is in the correct format
  const parsedDataset = parseDataset(parsedData, 'dd.MM.yyyy HH:mm:ss.SSS')

  return [{
    id: 0,
    data: parsedDataset,
    filename: 'datazhaw100.csv' // Store the filename
  }]
})

const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    addDataset: (state, action: PayloadAction<{ data: any[]; filename: string }>) => {
      try {
        // Parse the dataset before adding it to the state
        const parsedData = parseDataset(action.payload.data, 'dd.MM.yyyy HH:mm:ss.SSS')

        const newDataset: Dataset = {
          id: state.datasets.length > 0 ? state.datasets[state.datasets.length - 1].id + 1 : 1,
          data: parsedData,
          filename: action.payload.filename,
        }
        state.datasets.push(newDataset)
      } catch (error) {
        console.error('Error parsing dataset in reducer:', error)
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