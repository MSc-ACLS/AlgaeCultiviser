import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit"
import Papa from 'papaparse'

interface Dataset {
  id: number
  data: any[]
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
  const response = await fetch('/data/testdata100.csv')
  const fileContent = await response.text()
  let parsedData: any[] = []
  Papa.parse(fileContent, {
    complete: (result) => {
      parsedData = result.data as any[]
    },
    header: false,
  })
  return [{
    id: 0,
    data: parsedData
  }]
})

const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    addDataset: (state, action: PayloadAction<any[]>) => {
      const nextId = state.datasets.length > 0 ? Math.max(...state.datasets.map(dataset => dataset.id)) + 1 : 1;
      state.datasets.push({ id: nextId, data: action.payload });
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