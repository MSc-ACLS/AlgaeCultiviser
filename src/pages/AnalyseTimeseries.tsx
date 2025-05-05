import { Box, Typography, FormControlLabel, Checkbox, Button, IconButton, Tooltip } from '@mui/material'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../store'
import { PointTooltipProps, ResponsiveLineCanvas } from '@nivo/line'
import { useState, useMemo, useEffect, useRef } from 'react'
import { parse, isValid } from 'date-fns'
import { useTheme } from '@mui/material/styles'
import { handleDownloadChart } from '../utils/downloadChart'
import DownloadForOfflineTwoToneIcon from '@mui/icons-material/DownloadForOfflineTwoTone'

type DataPoint = {
  x: Date
  y: number
  originalY?: number
}

type Series = {
  id: string
  data: DataPoint[]
  color?: string
}

type ClosestMetadataPoint = {
  x: number
  y: number
  serieId: string
  serieColor?: string
}

const AnalyseTimeseries: React.FC = () => {
  const datasets = useSelector((state: RootState) => state.data.datasets)
  const selectedDatasetId = useSelector((state: RootState) => state.data.selectedDatasetId)
  const selectedDataset = selectedDatasetId !== null ? datasets.find(dataset => dataset.id === selectedDatasetId) : null

  const [visibleLines, setVisibleLines] = useState<{ [key: string]: boolean }>({})
  const chartRef = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()
  const currentTheme = useSelector((state: RootState) => state.theme)
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number
    y: number
    serieId: string
    serieColor: string
    data: any
    source: 'main' | 'metadata'
  } | null>(null)

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
      }
    })

    return normalisedData
  }

  const { metadataSeries, mainSeries } = useMemo(() => {
    if (!selectedDataset) return { metadataSeries: [] as Series[], mainSeries: [] as Series[] }

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
      }).filter((point) => point !== null) as DataPoint[],
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
        }).filter((point) => point !== null) as DataPoint[],
      }))

      rawData.push(...metadataRawData)
    }

    // Normalize and split data
    const normalised = normaliseData(
      rawData.filter((variableData: { data: string | any[] }) => variableData.data.length > 0)
    )

    const metadataSeries = normalised.filter((d) => d.id.startsWith('Metadata:')) as Series[]
    const mainSeries = normalised.filter((d) => !d.id.startsWith('Metadata:')) as Series[]

    return { metadataSeries, mainSeries }
  }, [selectedDataset])

  const data = useMemo(() => {
    const styledSeries = [
      ...mainSeries.map(s => ({ ...s, pointSize: 0, lineWidth: 1 })),
      ...metadataSeries.map(s => ({ ...s, pointSize: 8, lineWidth: 0 }))
    ]
    
    return styledSeries
  }, [mainSeries, metadataSeries])

  const combinedSeries = useMemo(() => {
    return [
      ...mainSeries.map((series) => ({
        ...series,
        lineWidth: 1, // Visible lines for main series
        pointSize: 0, // No points for main series
      })),
      ...metadataSeries.map((series) => ({
        ...series,
        lineWidth: 0, // No lines for metadata
        pointSize: 0, // Invisible points for metadata
      })),
    ]
  }, [mainSeries, metadataSeries])

  console.log('Normalised data:', data)

  const theme = useTheme()

  const sharedChartProps = {
    margin: { top: 20, right: 200, bottom: 40, left: 50 },
    enableGridX: false,
    enableGridY: false,
    theme: {
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
    },
    // tooltip: ({ point }: PointTooltipProps) => {
    //   const isCursorLow = point.y > 100
    //   const originalY = (point.data as any).originalY

    //   const variableIndex = selectedDataset?.data[0].indexOf(point.serieId)
    //   const unit =
    //     variableIndex !== undefined && variableIndex >= 0
    //       ? selectedDataset?.data[1][variableIndex]
    //       : ''

    //   return (
    //     <Box
    //       sx={{
    //         background: point.serieColor,
    //         borderRadius: '8px',
    //         padding: '8px',
    //         textAlign: 'left',
    //         transform: isCursorLow ? null : 'translateY(+150%)',
    //       }}
    //     >
    //       <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
    //         {point.serieId} {unit && `[${unit}]`}
    //       </Typography>
    //       <Typography variant="body2">Time: {new Date(point.data.x).toLocaleString()}</Typography>
    //       <Typography variant="body2">Value: {originalY?.toString()}</Typography>
    //     </Box>
    //   )
    // }
  }

  const findClosestMetadataPoint = (x: number, y: number): ClosestMetadataPoint | null => {
    let closestPoint: ClosestMetadataPoint | null = null
    let minDistance = 10 // Threshold in pixels
  
    metadataSeries.forEach((series) => {
      series.data.forEach((point) => {
        const dx = x - point.x.getTime()
        const dy = y - point.y
        const distance = Math.sqrt(dx * dx + dy * dy)
  
        if (distance < minDistance) {
          closestPoint = { x: point.x.getTime(), y: point.y, serieId: series.id, serieColor: series.color }
          minDistance = distance
        }
      })
    })
  
    return closestPoint
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
        <Box ref={chartRef} sx={{ height: '100%', width: '100%', position: 'relative' }}>
          <ResponsiveLineCanvas
            data={combinedSeries}
            pointSize={0}
            xFormat="time:%d.%m.%Y %H:%M"
            xScale={{
              type: 'time',
              format: '%d.%m.%Y %H:%M',
              precision: 'minute',
            }}
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
            colors={{ scheme: 'category10' }}
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
                symbolSize: 10,
                itemDirection: 'left-to-right',
                itemTextColor: theme.palette.text.secondary,
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
            onMouseMove={(point) => {
              setHoveredPoint({
                x: point.x,
                y: point.y,
                serieId: point.serieId as string,
                serieColor: point.serieColor,
                data: point.data as DataPoint,
                source: typeof point.serieId === 'string' && point.serieId.startsWith('Metadata:') ? 'metadata' : 'main',
              })
            }}
            onMouseLeave={() => setHoveredPoint(null)}
            {...sharedChartProps}
          />

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            <ResponsiveLineCanvas
              data={metadataSeries.filter((d) => visibleLines[d.id] !== false)}
              pointSize={8}
              legends={[]}
              isInteractive={false} // Disable interactivity
              xScale={{
                type: 'time',
                format: '%Y-%m-%dT%H:%M:%S.%LZ',
                precision: 'minute',
              }}
              layers={[
                'points',
              ]}
              // onMouseMove={(point) => {
              //   setHoveredPoint({
              //     x: point.x,
              //     y: point.y,
              //     serieId: point.serieId as string,
              //     serieColor: point.serieColor,
              //     data: point.data as DataPoint, // Explicitly cast to DataPoint
              //     source: 'metadata',
              //   })
              // }}
              //onMouseLeave={() => setHoveredPoint(null)}            
              {...sharedChartProps}
            />
          </div>
        </Box>

        {hoveredPoint && (
          <Box
            sx={{
              background: hoveredPoint.serieColor,
              borderRadius: '8px',
              padding: '8px',
              textAlign: 'left',
              transform: hoveredPoint.y > 100 ? null : 'translateY(+150%)',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {hoveredPoint.serieId} ({hoveredPoint.source === 'main' ? 'Main' : 'Metadata'})
            </Typography>
            <Typography variant="body2">
              Time: {new Date(hoveredPoint.data.x).toLocaleString()}
            </Typography>
            <Typography variant="body2">
              Value: {hoveredPoint.data.originalY?.toString()}
            </Typography>
          </Box>
        )}

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
