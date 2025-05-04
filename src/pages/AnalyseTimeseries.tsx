import { Box, Typography, FormControlLabel, Checkbox, Button, IconButton, Tooltip } from '@mui/material'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../store'
import { ResponsiveLineCanvas, Point, CustomCanvasLayerProps } from '@nivo/line'
import { useState, useMemo, useEffect, useRef } from 'react'
import { parse, isValid } from 'date-fns'
import { useTheme } from '@mui/material/styles'
import { handleDownloadChart } from '../utils/downloadChart'
import DownloadForOfflineTwoToneIcon from '@mui/icons-material/DownloadForOfflineTwoTone'

const AnalyseTimeseries: React.FC = () => {
  const datasets = useSelector((state: RootState) => state.data.datasets)
  const selectedDatasetId = useSelector((state: RootState) => state.data.selectedDatasetId)
  const selectedDataset = selectedDatasetId !== null ? datasets.find(dataset => dataset.id === selectedDatasetId) : null

  const [visibleLines, setVisibleLines] = useState<{ [key: string]: boolean }>({})
  const chartRef = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()
  const currentTheme = useSelector((state: RootState) => state.theme)

  useEffect(() => {
    if (selectedDataset) {
      const initialVisibleLines = selectedDataset.data[0].reduce(
        (acc: { [key: string]: boolean }, variable: string) => {
          acc[variable] = true
          return acc
        },
        {}
      )
      setVisibleLines(initialVisibleLines)
    }
  }, [selectedDataset])

  const handleCheckboxChange = (variable: string) => {
    setVisibleLines(prevState => ({
      ...prevState,
      [variable]: !prevState[variable],
    }))
  }

  const handleDownload = async () => {
    await handleDownloadChart(chartRef, 'timeseries-chart.png', currentTheme, dispatch)
  }

  const normaliseData = (data: any[]) => {
    const normalisedData = data.map((variableData: { id: string; data: { x: Date; y: number }[] }) => {
      const yValues = variableData.data.map((point) => point.y).filter((y) => y !== null)
      const min = Math.min(...yValues)
      const max = Math.max(...yValues)

      if (yValues.length < 2 || min === max) {
        return {
          id: variableData.id,
          data: variableData.data.map((point) => ({
            x: point.x,
            originalY: point.y,
            y: 0.5,
          })),
        }
      }

      return {
        id: variableData.id,
        data: variableData.data.map((point) => {
          if (!point.x || isNaN(point.x.getTime()) || point.y === null) {
            console.warn(`Invalid normalised point skipped: x=${point.x}, y=${point.y}`)
            return null
          }

          return {
            x: point.x,
            originalY: point.y,
            y: (point.y - min) / (max - min),
          }
        }).filter((point) => point !== null),
        pointSize: variableData.id.startsWith('Metadata:') ? 8 : 0,
        lineWidth: variableData.id.startsWith('Metadata:') ? 0 : 1,
      }
    })

    return normalisedData
  }

  const data = useMemo(() => {
    if (!selectedDataset) return []

    const rawData = selectedDataset.data[0].slice(1).map((variable: string, index: number) => ({
      id: variable,
      data: selectedDataset.data.slice(2).map((row) => {
        const x = row[0]
        const y = row[index + 1]

        // Check if the value is numerical
        const isNumerical = !isNaN(parseFloat(y)) && isFinite(y)

        // Check if the date is in ISO format
        const isISODate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x)

        let parsedDate
        if (isISODate) {
          parsedDate = new Date(x)
        } else {
          // Normalize the date string
          const normalizedDate = x.trim().replace(/(\.\d{1,2})$/, (match: string) => match.padEnd(4, '0'))
          parsedDate = parse(normalizedDate, 'dd.MM.yyyy HH:mm:ss.SSS', new Date())
        }

        if (!isValid(parsedDate) || !isNumerical) {
          console.warn(`Invalid data point skipped: raw=${x}, parsed=${parsedDate}, y=${y}`)
          return null
        }

        return { x: parsedDate, y: parseFloat(y) }
      }).filter((point) => point !== null),
      curve: 'monotoneX', // Default curve for main datasets
    }))

    // Add metadata if it exists
    if (selectedDataset.metadata) {
      const metadataRawData = selectedDataset.metadata.data[0].slice(1).map((variable: string, index: number) => ({
        id: `Metadata: ${variable}`,
        data: selectedDataset.metadata?.data.slice(2).map((row) => {
          const x = row[0]
          const y = row[index + 1]

          // Check if the value is numerical
          const isNumerical = !isNaN(parseFloat(y)) && isFinite(y)

          let parsedDate = parse(x, 'dd.MM.yyyy HH:mm:ss.SSS', new Date())
          if (!isValid(parsedDate) || !isNumerical) {
            console.warn(`Invalid metadata point skipped: raw=${x}, parsed=${parsedDate}, y=${y}`)
            return null
          }

          return { x: parsedDate, y: parseFloat(y) }
        }).filter((point) => point !== null),
        curve: 'linear', // Use linear curve for metadata
      }))

      rawData.push(...metadataRawData)
    }

    // Filter out datasets with no valid data points
    return normaliseData(rawData.filter((variableData: { data: string | any[] }) => variableData.data.length > 0))
  }, [selectedDataset])

  console.log('Normalised data:', data)

  const theme = useTheme()

  const MetadataPointsLayer = ({ points, ctx }: CustomCanvasLayerProps) => {
    points
      .filter((point) => typeof point.serieId === 'string' && point.serieId.startsWith('Metadata:')) // Only render points for metadata series
      .forEach((point) => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI) // Draw a circle with radius 8
        ctx.fillStyle = point.color // Fill color based on the series color
        ctx.fill()
        ctx.strokeStyle = 'white' // White border
        ctx.lineWidth = 0
        ctx.stroke()
        ctx.closePath()
      })
  }

  const LinesLayer = ({ series, ctx, lineGenerator, xScale, yScale }: CustomCanvasLayerProps) => {
    series
      .filter((serie) => typeof serie.id === 'string' && !serie.id.startsWith('Metadata:')) // Exclude metadata lines
      .forEach((serie) => {
        ctx.beginPath()
        ctx.strokeStyle = serie.color || 'black' // Fallback to 'black' if color is undefined
        ctx.lineWidth = 1
        lineGenerator.context(ctx)(serie.data.map((d) => ({ x: xScale(d.data.x), y: yScale(d.data.y) })))
        ctx.stroke()
      })
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant='h5' sx={{ mb: 2 }}>Time Series</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'row', mb: 2, flexWrap: 'wrap' }}>
        {selectedDataset &&
          selectedDataset.data[0].slice(1).map((variable: string) => (
            <FormControlLabel
              key={variable}
              control={
                <Checkbox
                  checked={visibleLines[variable] !== false}
                  onChange={() => handleCheckboxChange(variable)}
                  sx={{ transform: 'scale(0.8)' }}
                  color='secondary'
                />
              }
              label={variable}
              sx={{ fontSize: '0.8rem' }} 
            />
          ))}
      </Box>

      <Box
        sx={{
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          ref={chartRef}
          sx={{
            height: '100%',
            width: '100%',
          }}
        >
          <ResponsiveLineCanvas
            data={data.filter((d: { id: string }) => visibleLines[d.id] !== false)} // Pass all data
            margin={{ top: 20, right: 200, bottom: 40, left: 50 }}
            xScale={{
              type: 'time',
              format: '%Y-%m-%dT%H:%M:%S.%LZ',
              precision: 'minute',
            }}
            xFormat="time:%d.%m.%Y %H:%M"
            yScale={{
              type: 'linear',
              min: 'auto',
              max: 'auto',
              stacked: false,
              reverse: false,
            }}
            axisBottom={{
              tickSize: 2,
              tickPadding: 5,
              legend: 'Time',
              legendOffset: 30,
              legendPosition: 'middle',
              format: '%d.%m.%Y %H:%M',
              tickValues: 5,
            }}
            axisLeft={{
              tickSize: 2,
              tickPadding: 5,
              legend: 'Norm. Value',
              legendOffset: -40,
              legendPosition: 'middle',
            }}
            colors={{ scheme: 'category10' }}
            enableGridX={false}
            enableGridY={false}
            pointSize={0} // Disable default points
            lineWidth={1} // Default line width for main datasets
            layers={[
              'grid',
              'markers',
              'axes',
              'areas',
              LinesLayer, // Custom layer for main dataset lines
              'slices',
              'mesh',
              'legends',
              MetadataPointsLayer, // Custom layer for metadata points
            ]}
            legends={[
              {
                anchor: 'right',
                direction: 'column',
                justify: false,
                translateX: 120,
                translateY: 0,
                itemWidth: 100,
                itemHeight: 20,
                itemsSpacing: 4,
                symbolSize: 20,
                symbolShape: 'circle',
                itemDirection: 'left-to-right',
                itemTextColor: '#777',
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemBackground: 'rgba(0, 0, 0, .03)',
                      itemOpacity: 1,
                    },
                  },
                ],
              },
            ]}
            tooltip={({ point }: { point: any }) => {
              const originalY = (point.data as any).originalY
              return (
                <Box
                  sx={{
                    background: point.serieColor,
                    borderRadius: '8px',
                    padding: '8px',
                    textAlign: 'left',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {point.serieId}
                  </Typography>
                  <Typography variant="body2">Time: {new Date(point.data.x).toLocaleString()}</Typography>
                  <Typography variant="body2">Value: {originalY?.toString()}</Typography>
                </Box>
              )
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
          />
        </Box>

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
            <DownloadForOfflineTwoToneIcon fontSize="large" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default AnalyseTimeseries
