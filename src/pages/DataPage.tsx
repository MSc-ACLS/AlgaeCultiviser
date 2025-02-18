import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../store'
import { addDataset, removeDataset } from '../features/dataSlice'
import { Button, Typography, Box } from '@mui/material'
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid'
import { useState, useEffect } from 'react'

const DataPage: React.FC = () => {
  const datasets = useSelector((state: RootState) => state.data.datasets)
  const dispatch = useDispatch<AppDispatch>()
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([])
  const [selectedDataset, setSelectedDataset] = useState<any[]>([])

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'columns', headerName: 'Number of Columns', width: 150 },
    { field: 'rows', headerName: 'Number of Rows', width: 150 },
  ]

  const rows = datasets.map((dataset) => ({
    id: dataset.id,
    columns: dataset.data[0]?.length || 0,
    rows: dataset.data.length,
  }))

  const handleRemoveDataset = () => {
    if (selectionModel.length > 0) {
      dispatch(removeDataset(selectionModel[0] as number))
    }
  }

  useEffect(() => {
    if (selectionModel.length > 0) {
      const selectedId = selectionModel[0] as number
      const dataset = datasets.find((d) => d.id === selectedId)
      setSelectedDataset(dataset ? dataset.data : [])
    } else {
      setSelectedDataset([])
    }
  }, [selectionModel, datasets])

  const dataViewColumns: GridColDef[] = selectedDataset[0]
    ? selectedDataset[0].map((col: string, index: number) => ({
      field: `col${index}`,
      headerName: col,
      width: 150,
    }))
    : []

  const dataViewRows = selectedDataset.slice(1).map((row, index) => {
    const rowData: { [key: string]: any } = { id: index }
    row.forEach((cell: any, cellIndex: number) => {
      rowData[`col${cellIndex}`] = cell
    })
    return rowData
  })

  const getColumnStats = (columnData: any[]) => {
    const count = columnData.length
    const mean = columnData.reduce((acc, val) => acc + val, 0) / count
    const min = Math.min(...columnData)
    const max = Math.max(...columnData)
    return { count, mean, min, max }
  }

  const dataStatsColumns: GridColDef[] = [
    { field: 'variable', headerName: 'Variable', width: 150 },
    { field: 'type', headerName: 'Type', width: 100 },
    { field: 'count', headerName: 'Count', width: 100 },
    { field: 'mean', headerName: 'Mean', width: 100 },
    { field: 'min', headerName: 'Min', width: 100 },
    { field: 'max', headerName: 'Max', width: 100 },
  ]

  const dataStatsRows = selectedDataset[0]
    ? selectedDataset[0].map((col: string, index: number) => {
      const columnData = selectedDataset.slice(1).map(row => row[index])
      const { count, mean, min, max } = getColumnStats(columnData)
      return {
        id: index,
        variable: col,
        type: typeof columnData[0],
        count,
        mean: isNaN(mean) ? 'N/A' : mean.toFixed(2),
        min: isNaN(min) ? 'N/A' : min,
        max: isNaN(max) ? 'N/A' : max,
      }
    })
    : []

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        //backgroundColor: '#a2d5ab',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant='h5'>Datasets</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='contained'
            onClick={() => dispatch(addDataset([]))}
          >
            Add Dataset
          </Button>
          <Button
            variant='contained'
            onClick={handleRemoveDataset}
          >
            Remove Selected Dataset
          </Button>
        </Box>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', mb: 4 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pagination
          pageSizeOptions={[5]}
          rowHeight={40}
          checkboxSelection={false}
          onRowSelectionModelChange={(newSelectionModel) => {
            setSelectionModel(newSelectionModel)
          }}
          rowSelectionModel={selectionModel}
          sx={{
            '& .MuiDataGrid-row': {
              maxHeight: '40px',
              minHeight: '40px',
            },
            '& .MuiDataGrid-cell': {
              padding: '4px',
            },
          }}
        />
      </Box>
      <Typography variant='h5' sx={{ mb: 2 }}>Variables</Typography>
      <Box sx={{ flex: 1, overflow: 'auto', mb: 4 }}>
        <DataGrid
          rows={dataStatsRows}
          columns={dataStatsColumns}
          pagination
          pageSizeOptions={[5]}
          rowHeight={40}
          checkboxSelection={false}
          sx={{
            '& .MuiDataGrid-row': {
              maxHeight: '40px',
              minHeight: '40px',
            },
            '& .MuiDataGrid-cell': {
              padding: '4px',
            },
          }}
        />
      </Box>
      <Typography variant='h5' sx={{ mb: 2 }}>View</Typography>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <DataGrid
          rows={dataViewRows}
          columns={dataViewColumns}
          pagination
          pageSizeOptions={[5]}
          rowHeight={40}
          checkboxSelection={false}
          sx={{
            '& .MuiDataGrid-row': {
              maxHeight: '40px',
              minHeight: '40px',
            },
            '& .MuiDataGrid-cell': {
              padding: '4px',
            },
          }}
        />
      </Box>
    </Box>
  )
}

export default DataPage
