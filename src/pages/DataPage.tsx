import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../store'
import { addDataset, removeDataset, setSelectedDatasetId } from '../features/dataSlice'
import { Button, Typography, Box, Tooltip } from '@mui/material'
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid'
import { useState, useEffect } from 'react'
import Papa from 'papaparse'

const DataPage: React.FC = () => {
  const datasets = useSelector((state: RootState) => state.data.datasets)
  const selectedDatasetId = useSelector((state: RootState) => state.data.selectedDatasetId)
  const dispatch = useDispatch<AppDispatch>()
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([])

  useEffect(() => {
    if (selectedDatasetId !== null) {
      setSelectionModel([selectedDatasetId])
    }
  }, [selectedDatasetId])

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'columns', headerName: '# of Columns', width: 150 },
    { field: 'rows', headerName: '# of Rows', width: 150 },
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
      dispatch(setSelectedDatasetId(selectionModel[0] as number))
    } else {
      dispatch(setSelectedDatasetId(null))
    }
  }, [selectionModel, dispatch])

  const getColumnStats = (columnData: any[]) => {
    const count = columnData.length
    const mean = columnData.reduce((acc, val) => acc + val, 0) / count
    const min = Math.min(...columnData)
    const max = Math.max(...columnData)
    return { count, mean, min, max }
  }

  const formatNumber = (num: number) => {
    return num.toPrecision(3)
  }

  const selectedDataset = selectedDatasetId !== null ? datasets.find(dataset => dataset.id === selectedDatasetId) : null

  const dataViewColumns: GridColDef[] = selectedDataset && selectedDataset.data[0]
    ? selectedDataset.data[0].map((col: string, index: number) => {
        const columnData = selectedDataset.data.slice(1).map(row => row[index])
        const { count, mean, min, max } = getColumnStats(columnData)
        const type = typeof columnData[0]
        const tooltipTitle = (
          <table>
            <tbody>
              <tr>
            <td>Type:</td>
                <td>{type}</td>
            </tr>
              <tr>
                <td>Count:</td>
                <td>{count}</td>
            </tr>
              <tr>
                <td>Mean:</td>
                <td>{isNaN(mean) ? 'N/A' : formatNumber(mean)}</td>
            </tr>
              <tr>
                <td>Min:</td>
                <td>{isNaN(min) ? 'N/A' : formatNumber(min)}</td>
            </tr>
              <tr>
                <td>Max:</td>
                <td>{isNaN(max) ? 'N/A' : formatNumber(max)}</td>
          </tr>
            </tbody>
          </table>
        )
        return {
          field: `col${index}`,
          headerName: col,
          width: 150,
          renderHeader: (params: { colDef: GridColDef }) => (
            <Tooltip title={tooltipTitle}>
              <span>{params.colDef.headerName}</span>
            </Tooltip>
          ),
        }
      })
    : []

  const dataViewRows = selectedDataset ? selectedDataset.data.slice(1).map((row, index) => {
    const rowData: { [key: string]: any } = { id: index }
    row.forEach((cell: any, cellIndex: number) => {
      rowData[`col${cellIndex}`] = cell
    })
    return rowData
  }) : []

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          const data = result.data as any[]
          dispatch(addDataset(data))
        },
        header: false,
      })
    }
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant='h5'>Datasets</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='contained'
            component='label'
          >
            Upload Dataset
            <input
              type='file'
              accept='.csv'
              hidden
              onChange={handleFileUpload}
            />
          </Button>
          <Button
            variant='contained'
            onClick={handleRemoveDataset}
          >
            Remove Selected Dataset
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flex: 1, overflow: 'auto', mb: 4 }}>
        <Box sx={{ flex: 1, overflow: 'auto', mr: 2 }}>
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
      </Box>
      <Typography variant='h5' sx={{ mb: 2 }}>Data View</Typography>
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
