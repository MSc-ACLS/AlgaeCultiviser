import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../store'
import { addDataset, removeDataset, setSelectedDatasetId } from '../features/dataSlice'
import { Button, Typography, Box, Tooltip, Checkbox, Alert, Snackbar, Chip } from '@mui/material'
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import { parseDataset } from '../utils/parseDataset'
import { parse, isValid } from 'date-fns'

const Data: React.FC = () => {
  const datasets = useSelector((state: RootState) => state.data.datasets)
  const selectedDatasetId = useSelector<RootState, string | number | null>(
    (state) => state.data.selectedDatasetId
  )
  const dispatch = useDispatch<AppDispatch>()
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([])
  const [compareSelection, setCompareSelection] = useState<number[]>([])
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ message: string | null, open: boolean }>({ message: null, open: false })
  const navigate = useNavigate()

  useEffect(() => {
    if (selectedDatasetId !== null) {
      setSelectionModel([selectedDatasetId])
    }
  }, [selectedDatasetId])

  const handleCompareChange = (id: number) => {
    setCompareSelection((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    )
  }

  const handleCompare = () => {
    if (compareSelection.length > 1) {
      navigate('/compare', { state: { selectedIds: compareSelection } })
    }
  }

  const columns: GridColDef[] = [
    { field: 'filename', headerName: 'Filename', width: 200 },
    { field: 'columns', headerName: '# of Columns', width: 150 },
    { field: 'rows', headerName: '# of Rows', width: 150 },
    {
      field: 'analyse',
      headerName: 'Analyse',
      width: 250,
      renderCell: (params) =>
        !params.row.isMetadata && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
            <Button
              variant='contained'
              size='small'
              color='secondary'
              onClick={() => {
                dispatch(setSelectedDatasetId(params.row.id))
                navigate('/analyse/correlations')
              }}
            >
              Correlation
            </Button>
            <Button
              variant='contained'
              size='small'
              color='secondary'
              onClick={() => {
                dispatch(setSelectedDatasetId(params.row.id))
                navigate('/analyse')
              }}
            >
              Time Series
            </Button>
          </Box>
        ),
    },
        {
      field: 'optimise',
      headerName: 'Optimise',
      width: 150,
      renderCell: (params) =>
        !params.row.isMetadata && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
            <Button
              variant='contained'
              size='small'
              color='secondary'
              onClick={() => {
                dispatch(setSelectedDatasetId(params.row.id))
                navigate('/optimise')
              }}
            >
              Optimisation
            </Button>
          </Box>
        ),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 150,
      renderCell: (params) =>
        !params.row.isMetadata && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
            <Chip
              label={!params.row.isMetadata ? params.row.type : null}
              color='secondary'
              size='small'
            />
          </Box>
        ),
    },
    // {
    //   field: 'compare',
    //   headerName: 'Compare',
    //   width: 150,
    //   renderCell: (params) =>
    //     !params.row.isMetadata && (
    //       <Box sx={{ display: 'flex', alignItems: 'center', height: '100%'}}>
    //         <Checkbox
    //           color='secondary'
    //           checked={compareSelection.includes(params.row.id)}
    //           onChange={() => handleCompareChange(params.row.id)}
    //         />
    //       </Box>
    //     ),
    // },
  ]

  const rows = datasets.flatMap((dataset) => {
    const mainRow = {
      id: dataset.id,
      filename: dataset.filename,
      type: dataset.type,
      columns: dataset.data[0]?.length || 0,
      rows: dataset.data.length,
      timeSeries: 'link',
    }
  
    const metadataRow = dataset.metadata
      ? {
          id: `${dataset.id}_meta`,
          filename: dataset.metadata.filename,
          columns: dataset.metadata.data[0]?.length || 0,
          rows: dataset.metadata.data.length,
          isMetadata: true,
        }
      : null
  
    return metadataRow ? [mainRow, metadataRow] : [mainRow]
  })

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
    const numericData = columnData
      .map((val) => parseFloat(val))
      .filter((val) => !isNaN(val))

    const count = numericData.length
    if (count === 0) {
      return { count: 0, mean: NaN, min: NaN, max: NaN }
    }

    const mean = numericData.reduce((acc, val) => acc + val, 0) / count
    const min = Math.min(...numericData)
    const max = Math.max(...numericData)
    return { count, mean, min, max }
  }

  const formatNumber = (num: number) => {
    return num.toPrecision(3)
  }

  const selectedDataset = useMemo(() => {
    if (selectedDatasetId === null) return null

    if (typeof selectedDatasetId === 'string' && selectedDatasetId.includes('_meta')) {
      const mainDatasetId = parseInt(selectedDatasetId.split('_')[0], 10)
      const mainDataset = datasets.find((dataset) => dataset.id === mainDatasetId)

      return mainDataset?.metadata || null
    }

    return datasets.find((dataset) => dataset.id === selectedDatasetId) || null
  }, [selectedDatasetId, datasets])

  const dataViewColumns: GridColDef[] = selectedDataset && selectedDataset.data[0]
    ? selectedDataset.data[0].map((col: string, index: number) => {
        const columnData = selectedDataset.data.slice(2).map(row => row[index])

        const isDateColumn = columnData.every(
          (value) => typeof value === 'string' && isValid(parse(value, 'dd.MM.yyyy HH:mm:ss.SSS', new Date()))
        )

        const { count, mean, min, max } = getColumnStats(
          isDateColumn ? columnData.map((value) => parse(value, 'dd.MM.yyyy HH:mm:ss.SSS', new Date()).getTime()) : columnData
        )

        //const type = isDateColumn ? 'Date' : typeof columnData[0]

        const unit = selectedDataset.data[1]?.[index] || ''

        const tooltipTitle = (
          <table>
            <tbody>
              {/* <tr>
                <td>Type:</td>
                <td>{type}</td>
              </tr> */}
              <tr>
                <td>Count:</td>
                <td>{count}</td>
              </tr>
              <tr>
                <td>Mean:</td>
                <td>
                  {isNaN(mean)
                    ? 'N/A'
                    : isDateColumn
                    ? new Date(mean).toLocaleString()
                    : formatNumber(mean)}
                </td>
              </tr>
              <tr>
                <td>Min:</td>
                <td>
                  {isNaN(min)
                    ? 'N/A'
                    : isDateColumn
                    ? new Date(min).toLocaleString()
                    : formatNumber(min)}
                </td>
              </tr>
              <tr>
                <td>Max:</td>
                <td>
                  {isNaN(max)
                    ? 'N/A'
                    : isDateColumn
                    ? new Date(max).toLocaleString()
                    : formatNumber(max)}
                </td>
              </tr>
            </tbody>
          </table>
        )

        return {
          field: `col${index}`,
          headerName: `${col} [${unit}]`,
          width: 150,
          renderHeader: (params: { colDef: GridColDef }) => (
            <Tooltip title={tooltipTitle}>
              <span>{params.colDef.headerName}</span>
            </Tooltip>
          ),
        }
      })
    : []

  const dataViewRows = selectedDataset
    ? selectedDataset.data.slice(2).map((row, index) => {
        const rowData: { [key: string]: any } = { id: index }
        row.forEach((cell: any, cellIndex: number) => {
          if (cellIndex === 0 && typeof cell === 'string' && !isNaN(Date.parse(cell))) {
            rowData[`col${cellIndex}`] = new Date(cell).toLocaleString()
          } else {
            rowData[`col${cellIndex}`] = cell
          }
        })
        return rowData
      })
    : []

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          const rawData = result.data as any[]
          if (rawData.length > 1) {
            try {

              const type = file.name.includes('agro') ? 'agroscope' : 'zhaw'

              const data = parseDataset(rawData, type, 'dd.MM.yyyy HH:mm:ss.SSS')

              const isMetaFile = file.name.includes('_meta.csv')
              if (isMetaFile) {
                const mainFileName = file.name.replace('_meta.csv', '.csv')
                const mainDataset = datasets.find((dataset) => dataset.filename === mainFileName)

                if (mainDataset) {
                  const nextId = Math.max(...datasets.map((d) => d.id), 0) + 1

                  dispatch(
                    addDataset({
                      ...mainDataset,
                      metadata: { id: nextId, data, filename: file.name },
                    })
                  )
                } else {
                  setSnackbar({ message: `No main file found for metadata file: ${file.name}`, open: true })
                }
              } else {
                const nextId = Math.max(...datasets.map((d) => d.id), 0) + 1

                dispatch(addDataset({ id: nextId, data, type: type, filename: file.name }))
              }
            } catch (error) {
              console.error('Error parsing dataset:', error)
            }
          }
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
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ message: null, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ message: null, open: false })}
          severity="warning"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {alertMessage && (
        <Alert
          severity="warning"
          onClose={() => setAlertMessage(null)}
          sx={{ mb: 2 }}
        >
          {alertMessage}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant='h5'>Datasets</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* <Button
            variant='contained'
            onClick={handleCompare}
            disabled={compareSelection.length <= 1}
          >
            Compare
          </Button> */}
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
            disabled={selectionModel.length === 0}
          >
            Remove Selected Dataset
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flex: 1, overflow: 'auto', mb: 4 }}>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
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

export default Data
