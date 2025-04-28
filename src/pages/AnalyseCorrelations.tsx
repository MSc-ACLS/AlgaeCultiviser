import { Box, Typography, FormControl, Select, MenuItem, SelectChangeEvent, Tooltip, IconButton } from '@mui/material'
import DownloadForOfflineTwoToneIcon from '@mui/icons-material/DownloadForOfflineTwoTone'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../store'
import { ResponsiveScatterPlotCanvas } from '@nivo/scatterplot'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useTheme } from '@mui/material/styles'
import { handleDownloadChart } from '../utils/downloadChart'

const AnalyseCorrelations: React.FC = () => {
  const datasets = useSelector((state: RootState) => state.data.datasets)
  const selectedDatasetId = useSelector((state: RootState) => state.data.selectedDatasetId)
  const selectedDataset = selectedDatasetId !== null ? datasets.find(dataset => dataset.id === selectedDatasetId) : null

  const [xVariable, setXVariable] = useState<string | null>(null)
  const [yVariable, setYVariable] = useState<string | null>(null)

  const unitX = xVariable && selectedDataset?.data[1][selectedDataset.data[0].indexOf(xVariable)]
    ? `[${selectedDataset.data[1][selectedDataset.data[0].indexOf(xVariable)]}]`
    : ''
  const unitY = yVariable && selectedDataset?.data[1][selectedDataset.data[0].indexOf(yVariable)]
    ? `[${selectedDataset.data[1][selectedDataset.data[0].indexOf(yVariable)]}]`
    : ''

  const chartRef = useRef<HTMLDivElement>(null)
  const [chartDimensions, setChartDimensions] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    if (chartRef.current) {
      const { width, height } = chartRef.current.getBoundingClientRect()
      setChartDimensions({ width, height })
    }
  }, [])

  const dispatch = useDispatch()
  const currentTheme = useSelector((state: RootState) => state.theme)

  useEffect(() => {
    if (selectedDataset) {
      const variables = selectedDataset.data[0].slice(1)
      if (variables.length >= 2) {
        setXVariable(variables[0])
        setYVariable(variables[1])
      }
    }
  }, [selectedDataset])

  const handleXVariableChange = (event: SelectChangeEvent<string>) => {
    setXVariable(event.target.value)
  }

  const handleYVariableChange = (event: SelectChangeEvent<string>) => {
    setYVariable(event.target.value)
  }

  const scatterData = useMemo(() => {
    if (!selectedDataset || !xVariable || !yVariable) return []

    const xIndex = selectedDataset.data[0].indexOf(xVariable)
    const yIndex = selectedDataset.data[0].indexOf(yVariable)

    if (xIndex === -1 || yIndex === -1) return []

    const points = selectedDataset.data.slice(2).map((row) => ({
      x: parseFloat(row[xIndex]),
      y: parseFloat(row[yIndex]),
    })).filter((point) => !isNaN(point.x) && !isNaN(point.y)) // Filter out invalid points

    // Calculate regression line
    const n = points.length
    const sumX = points.reduce((acc, point) => acc + point.x, 0)
    const sumY = points.reduce((acc, point) => acc + point.y, 0)
    const sumXY = points.reduce((acc, point) => acc + point.x * point.y, 0)
    const sumX2 = points.reduce((acc, point) => acc + point.x * point.x, 0)
    const sumY2 = points.reduce((acc, point) => acc + point.y * point.y, 0)

    const denominator = n * sumX2 - sumX * sumX
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0
    const intercept = n !== 0 ? (sumY - slope * sumX) / n : 0

    // Calculate R-value
    const rNumerator = n * sumXY - sumX * sumY
    const rDenominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
    const rValue = rDenominator !== 0 ? rNumerator / rDenominator : 0

    // Generate regression line points
    const xValues = points.map((point) => point.x)
    const xMin = Math.min(...xValues)
    const xMax = Math.max(...xValues)

    const regressionLine = [
      { x: xMin, y: slope * xMin + intercept },
      { x: xMax, y: slope * xMax + intercept },
    ]

    return [
      {
        id: `${xVariable} vs ${yVariable}`,
        data: points,
      },
      {
        id: 'Regression Line',
        data: regressionLine,
        rValue, // Store the R-value in the regression line dataset
      },
    ]
  }, [selectedDataset, xVariable, yVariable])

  const axisRanges = useMemo(() => {
    if (!scatterData.length) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }

    const allXValues = scatterData[0].data.map((point) => point.x)
    const allYValues = scatterData[0].data.map((point) => point.y)



    return {
      xMin: Math.min(...allXValues),
      xMax: Math.max(...allXValues),
      yMin: Math.min(...allYValues),
      yMax: Math.max(...allYValues),
    }
  }, [scatterData])

  const theme = useTheme()

  const handleDownload = async () => {
    await handleDownloadChart(chartRef, 'correlations-chart.png', currentTheme, dispatch)
  }

  // Custom layer to render the regression line
  const RegressionLineLayer = (ctx: CanvasRenderingContext2D, props: any) => {
    if (!chartDimensions) return

    const { width, height } = chartDimensions
    const regressionLine = scatterData.find((d) => d.id === 'Regression Line')?.data
    if (!regressionLine || regressionLine.length < 2) {
      return
    }

    const [start, end] = regressionLine

    if (!start || !end || isNaN(start.x) || isNaN(start.y) || isNaN(end.x) || isNaN(end.y)) {
      return
    }

    const { xScale, yScale } = props

    const x1 = xScale(start.x)
    const y1 = yScale(start.y)
    const x2 = xScale(end.x)
    const y2 = yScale(end.y)

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = theme.palette.error.main
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.restore()
  }


  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant='h5' sx={{ mb: 2 }}>
        Correlation Analysis
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl fullWidth>
          <Select value={xVariable || ''} onChange={handleXVariableChange}>
            {selectedDataset &&
              selectedDataset.data[0].slice(1).map((variable: string) => (
                <MenuItem key={variable} value={variable}>
                  {variable}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <Select value={yVariable || ''} onChange={handleYVariableChange}>
            {selectedDataset &&
              selectedDataset.data[0].slice(1).map((variable: string) => (
                <MenuItem key={variable} value={variable}>
                  {variable}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Box>

      <Box
        sx={{
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
        ref={chartRef} // Attach the ref to measure dimensions
      >
        <Box
          sx={{
            height: '100%',
            width: '100%',
          }}
        >
          <ResponsiveScatterPlotCanvas
            data={scatterData}
            margin={{ top: 20, right: 60, bottom: 60, left: 60 }}
            xScale={{ type: 'linear', min: axisRanges.xMin, max: axisRanges.xMax }}
            yScale={{ type: 'linear', min: axisRanges.yMin, max: axisRanges.yMax }}
            axisBottom={{
              tickSize: 2,
              tickPadding: 5,
              legend: `${xVariable || 'X Axis'} ${unitX}`,
              legendPosition: 'middle',
              legendOffset: 40,
            }}
            axisLeft={{
              tickSize: 2,
              tickPadding: 5,
              legend: `${yVariable || 'Y Axis'} ${unitY}`,
              legendPosition: 'middle',
              legendOffset: -50,
            }}
            theme={{
              axis: {
                ticks: {
                  text: {
                    fill: theme.palette.text.secondary,
                  },
                },
                legend: {
                  text: {
                    fill: theme.palette.text.secondary,
                  },
                },
              },
            }}
            colors={(d) => (d.serieId === 'Regression Line' ? theme.palette.error.main : theme.palette.secondary.main)}
            enableGridX={false}
            enableGridY={false}
            useMesh={true}
            nodeSize={(d) => (d.serieId === 'Regression Line' ? 0 : 5)}
            layers={[
              RegressionLineLayer,
              'grid',
              'axes',
              'nodes',
              'mesh',
              'legends',
            ]}
            tooltip={({ node }) => {
              if (node.serieId === 'Regression Line') {
                const regressionLine = scatterData.find((d) => d.id === 'Regression Line')
                const rValue = regressionLine?.rValue ?? 0

                return (
                  <Box
                    sx={{
                      background: theme.palette.error.main,
                      borderRadius: '8px',
                      padding: '8px',
                      textAlign: 'left',
                    }}
                  >
                    <Typography variant="body2">
                      R-Value: {rValue.toFixed(3)}
                    </Typography>
                  </Box>
                )
              }

              const isCursorLow = node.y > 100
              return (
                <Box
                  sx={{
                    background: node.color,
                    borderRadius: '8px',
                    padding: '8px',
                    textAlign: 'left',
                    transform: isCursorLow ? null : 'translateY(+150%)',
                  }}
                >
                  <Typography variant="body2">
                    {xVariable?.toString()}: {node.data.x?.toString()} {unitX}
                  </Typography>
                  <Typography variant="body2">
                    {yVariable?.toString()}: {node.data.y?.toString()} {unitY}
                  </Typography>
                </Box>
              )
            }}
          />
        </Box>

        {/* Download button outside the chartRef */}
        <Tooltip title={'Download Chart as PNG'}>
          <IconButton
            onClick={handleDownload}
            sx={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              zIndex: 10,
            }}
            color='secondary'
          >
            <DownloadForOfflineTwoToneIcon fontSize='large' />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default AnalyseCorrelations