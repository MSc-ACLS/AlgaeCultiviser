import { createSlice, PayloadAction } from "@reduxjs/toolkit"

interface Dataset {
  id: number
  data: any[]
}

interface DataState {
  datasets: Dataset[]
  selectedDatasetId: number | null
}

const initialState: DataState = {
  datasets: [{
    id: 0,
    data: [
      ["time.string","FLOW.OF.ALGAE","FLOW.OF.CO2","PAR.1","PAR.2","PRESSURE","SPEED","SUM.OF.WATER","TEMPERATURE","THICKNESS.OF.ALGAE","TURBIDITY","VOLUME.IN.TANK","pCO2","pH","pO2","TURBIDITY.diff","date","time","daily.evap","avg.daily.temp","daynight"],
      ["2024-06-07 14:20:00",17.57233625,0.01157407,499.891525,1229.38375,16.006945,90.44790125,3835.365625,24.4936325,5.442034625,0.05303005,71.95190125,5.95316,3.439524375,7.5082685,null,"2024-06-07","14:20:00",null,null,1],
      ["2024-06-07 14:30:00",17.927084,0.250868058,374.65279,1059.72224,16.269096,91.42606,3835.791,25.908565,5.5726553,0.07233803,79.812705,4.5148145,3.5326859,7.1408297,0.01930798,"2024-06-07","14:30:00",null,null,1],
      ["2024-06-07 14:40:00",17.959489,0.30700231,353.38542,948.78468,16.189235,91.636247,3835.791,27.028355,5.5542104,0.07233803,79.285274,4.7833151,3.5438924,6.9071476,0,"2024-06-07","14:40:00",null,null,1],
      ["2024-06-07 14:50:00",18.166668,0.3203125,337.93404,901.56252,16.42361,92.262915,3835.791,27.717014,5.6043625,0.07233803,76.648108,4.8463883,3.5497369,6.7712001,0,"2024-06-07","14:50:00",null,null,1],
      ["2024-06-07 15:00:00",17.416666,0.33506944,339.75694,832.72572,15.71007,90.120047,3835.791,28.139468,5.7859414,0.072275417,81.07042,4.9105251,3.5526616,6.6838128,-6.2613000000003e-05,"2024-06-07","15:00:00",null,null,1],
      ["2024-06-07 15:10:00",17.072337,0.32291669,313.02084,617.88196,15.539932,89.25326,3835.791,28.385418,5.5686651,0.068715439,82.186141,4.9776087,3.552663,6.6359021,-0.00355997799999999,"2024-06-07","15:10:00",null,null,1],
      ["2024-06-07 15:20:00",16.813658,0.31857641,313.10767,569.79168,15.215278,88.479619,3835.791,28.515626,5.6576845,0.066529192,83.139578,4.9980696,3.5525762,6.6140281,-0.002186247,"2024-06-07","15:20:00",null,null,1]
    ]
  }],
  selectedDatasetId: null
}

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
})

export const { addDataset, removeDataset, setSelectedDatasetId } = dataSlice.actions

export const dataReducer = dataSlice.reducer
export default dataReducer