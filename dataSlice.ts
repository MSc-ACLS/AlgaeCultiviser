import { createSlice, PayloadAction } from "@reduxjs/toolkit"

interface Dataset {
  id: number
  data: any[]
}

interface DataState {
  datasets: Dataset[]
}

const initialState: DataState = {
  datasets: [{ id: 1, data: [] }],
}

const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    increment: (state) => { state.datasets[0].data.push(state.datasets[0].data.length + 1) },
    decrement: (state) => { state.datasets[0].data.pop() },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.datasets[0].data.push(action.payload)
    },
    addDataset: (state, action: PayloadAction<Dataset>) => {
      state.datasets.push(action.payload)
    },
    removeDataset: (state, action: PayloadAction<number>) => {
      state.datasets = state.datasets.filter(dataset => dataset.id !== action.payload)
    }
  },
})

export const { increment, decrement, incrementByAmount, addDataset, removeDataset } = dataSlice.actions

export const dataReducer = dataSlice.reducer
export default dataReducer