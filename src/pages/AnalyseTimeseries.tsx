import { Box, Typography, Checkbox, IconButton, Tooltip } from '@mui/material'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../store'
import { PointTooltipProps, ResponsiveLineCanvas } from '@nivo/line'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { parse, isValid } from 'date-fns'
import { de } from 'date-fns/locale'
import { useTheme } from '@mui/material/styles'
import { handleDownloadChart } from '../utils/downloadChart'
import DownloadForOfflineTwoToneIcon from '@mui/icons-material/DownloadForOfflineTwoTone'
import React from 'react'
import { schemeSet1 } from 'd3-scale-chromatic'
import { ScaleTimeSpec } from '@nivo/scales'
import OutlinedInput from '@mui/material/OutlinedInput'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import ListItemText from '@mui/material/ListItemText'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import Button from '@mui/material/Button'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

type MetadataPoint = {
  x: Date
  y: number
  originalY: number
  serieId: string
}

type MetadataSeries = {
  id: string
  data: MetadataPoint[]
}

const ITEM_HEIGHT = 48
const ITEM_PADDING_TOP = 8
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
}

const AnalyseTimeseries: React.FC = () => {
  const datasets = useSelector((state: RootState) => state.data.datasets)
  const selectedDatasetId = useSelector((state: RootState) => state.data.selectedDatasetId)
  const selectedDataset = selectedDatasetId !== null ? datasets.find(dataset => dataset.id === selectedDatasetId) : null

  const [visibleLines, setVisibleLines] = useState<{ [key: string]: boolean }>({})
  const chartRef = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()
  const currentTheme = useSelector((state: RootState) => state.theme)
  const chartScalesRef = useRef<{ xScale: any; yScale: any } | null>(null)
  const [tooltip, setTooltip] = useState<{
    content: React.JSX.Element | null
    x: number
    y: number
  } | null>(null)
  const [zoomStart, setZoomStart] = useState<number | null>(null)
  const [zoomEnd, setZoomEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseLeave = () => {
    setTooltip(null)
    setIsDragging(false)
  }

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

      // Initialize selectedVariables with all variables
      setSelectedVariables(Object.keys(initialVisibleLines))
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
            serieId: variableData.id,
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
            serieId: variableData.id,
          }
        }).filter((point) => point !== null),
      }
    })

    return normalisedData
  }

  const { metadataSeries, mainSeries } = useMemo(() => {
    if (!selectedDataset) return { metadataSeries: [] as MetadataSeries[], mainSeries: [] }

    const rawData = selectedDataset.data[0].slice(1).map((variable: string, index: number) => ({
      id: variable,
      data: selectedDataset.data.slice(2).map((row) => {
        const x = row[0]
        const y = row[index + 1]

        const isNumerical = !isNaN(parseFloat(y)) && isFinite(y)
        const isISODate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x)

        let parsedDate
        if (isISODate) {
          parsedDate = new Date(x)
        } else {
          const normalizedDate = x.trim().replace(/(\.\d{1,2})$/, (match: string) => match.padEnd(4, '0'))
          parsedDate = parse(normalizedDate, 'dd.MM.yyyy HH:mm:ss.SSS', new Date())
        }

        if (!isValid(parsedDate) || !isNumerical) {
          console.warn(`Invalid data point skipped: raw=${x}, parsed=${parsedDate}, y=${y}`)
          return null
        }

        return { x: parsedDate, y: parseFloat(y) }
      }).filter((point) => point !== null),
    }))

    if (selectedDataset.metadata) {
      const metadataRawData = selectedDataset.metadata.data[0].slice(1).map((variable: string, index: number) => ({
        id: `Metadata: ${variable}`,
        data: selectedDataset.metadata?.data.slice(2).map((row) => {
          const x = row[0]
          const y = row[index + 1]

          const isNumerical = !isNaN(parseFloat(y)) && isFinite(y)
          const isISODate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x)

          let parsedDate
          if (isISODate) {
            parsedDate = new Date(x)
          } else {
            const normalizedDate = x.trim().replace(/(\.\d{1,2})$/, (match: string) => match.padEnd(4, '0'))
            parsedDate = parse(normalizedDate, 'dd.MM.yyyy HH:mm:ss.SSS', new Date())
          }
          if (!isValid(parsedDate) || !isNumerical) {
            console.warn(`Invalid metadata point skipped: raw=${x}, parsed=${parsedDate}, y=${y}`)
            return null
          }

          return { x: parsedDate, y: parseFloat(y) }
        }).filter((point) => point !== null),
      }))

      rawData.push(...metadataRawData)
    }

    const normalised = normaliseData(
      rawData.filter((variableData: { data: string | any[] }) => variableData.data.length > 0)
    )

    const metadataSeries: MetadataSeries[] = normalised.filter((d) => d.id.startsWith('Metadata:'))
    const mainSeries = normalised.filter((d) => !d.id.startsWith('Metadata:'))

    return { metadataSeries, mainSeries }
  }, [selectedDataset])

  const metadataColors = useMemo(() => {
    return metadataSeries.reduce((acc, metadata, index) => {
      acc[metadata.id] = schemeSet1[index % schemeSet1.length]
      return acc
    }, {} as { [key: string]: string })
  }, [metadataSeries])

  const data = useMemo(() => {
    const styledSeries = [
      ...mainSeries.map(s => ({ ...s, pointSize: 0, lineWidth: 1 })),
      ...metadataSeries.map(s => ({ ...s, pointSize: 8, lineWidth: 0 }))
    ]
    
    return styledSeries
  }, [mainSeries, metadataSeries])

  const theme = useTheme()

  const sharedChartProps: {
    margin: { top: number; right: number; bottom: number; left: number }
    enableGridX: boolean
    enableGridY: boolean
    theme: {
      axis: {
        ticks: { text: { fill: string } }
        legend: { text: { fill: string } }
      }
    }
    tooltip: (() => null) | (({ point }: PointTooltipProps) => React.ReactNode)
    xScale: {
      type: "time"
      format: string
      precision: "minute"
      min: Date | "auto"
      max: Date | "auto"
    }
  } = {
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
    tooltip: tooltip
      ? () => null
      : ({ point }: PointTooltipProps) => {
          const isCursorLow = point.y > 100
          const originalY = (point.data as any).originalY

          const variableIndex = selectedDataset?.data[0].indexOf(point.serieId)
          const unit =
            variableIndex !== undefined && variableIndex >= 0
              ? selectedDataset?.data[1][variableIndex]
              : ''

          return (
            <Box
              sx={{
                background: point.serieColor,
                borderRadius: '8px',
                padding: '8px',
                textAlign: 'left',
                transform: isCursorLow ? null : 'translateY(+150%)',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {point.serieId} {unit && `[${unit}]`}
              </Typography>
              <Typography variant="body2">
                Time: {new Date(point.data.x).toLocaleString()}
              </Typography>
              <Typography variant="body2">Value: {originalY?.toString()}</Typography>
            </Box>
          )
        },
    xScale: {
      type: "time",
      format: "%d.%m.%Y %H:%M",
      precision: "minute",
      min: "auto",
      max: "auto",
    },
  }

  const initialXScaleConfig: ScaleTimeSpec = useMemo(() => {
    if (!mainSeries || mainSeries.length === 0) {
      return {
        type: "time",
        format: "%d.%m.%Y %H:%M",
        precision: "minute",
        min: undefined,
        max: undefined,
      }
    }

    let minDate = Infinity
    let maxDate = -Infinity

    mainSeries.forEach((series) => {
      series.data.forEach((point) => {
        const time = point.x.getTime()
        if (time < minDate) minDate = time
        if (time > maxDate) maxDate = time
      })
    })

    return {
      type: "time",
      format: "%d.%m.%Y %H:%M",
      precision: "minute",
      min: new Date(minDate),
      max: new Date(maxDate),
    }
  }, [mainSeries])

  const [xScaleConfig, setXScaleConfig] = useState<ScaleTimeSpec>(initialXScaleConfig)
  const [fromDate, setFromDate] = useState<Date | null>(xScaleConfig.min as Date | null)
  const [toDate, setToDate] = useState<Date | null>(xScaleConfig.max as Date | null)

  const MetadataScatterplotLayer = ({ ctx, xScale, yScale }: any) => {
    if (!xScale || !yScale) {
      return
    }

    ctx.save()

    filteredMetadata.forEach((metadata) => {
      metadata.data.forEach((point) => {
        const x = xScale(point.x)
        const y = yScale(point.y)

        ctx.beginPath()
        ctx.arc(x, y, 8, 0, 2 * Math.PI)
        ctx.fillStyle = metadataColors[metadata.id]
        ctx.fill()
        ctx.closePath()
      })
    })

    ctx.restore()
  }

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!chartScalesRef.current || !metadataSeries) return
  
      const { xScale, yScale } = chartScalesRef.current
  
      const rect = chartRef.current?.getBoundingClientRect()
      if (!rect) return
  
      const margin = sharedChartProps.margin
      const mouseX = event.clientX - rect.left - margin.left
      const mouseY = event.clientY - rect.top - margin.top
  
      let closestPoint: MetadataPoint | null = null
      let minDistance = Infinity
  
      metadataSeries.forEach((metadata) => {
        metadata.data.forEach((point) => {
          const x = xScale(point.x)
          const y = yScale(point.y)
          const distance = Math.sqrt((x - mouseX) ** 2 + (y - mouseY) ** 2)

          // TODO: Add unit
  
          if (distance < 20 && distance < minDistance) {
            closestPoint = { x: point.x, y: point.y, originalY: point.originalY , serieId: metadata.id }
            minDistance = distance
          }
        })
      })
  
      if (closestPoint) {
        const isCursorLow = mouseY > 100

        const tooltipContent = (
          <Box
            sx={{
              background: theme.palette.background.paper,
              borderRadius: '8px',
              padding: '8px',
              textAlign: 'left',
              transform: isCursorLow ? null : 'translateY(+150%)',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {(closestPoint as MetadataPoint).serieId}
            </Typography>
            <Typography variant="body2">
              Time: {(closestPoint as MetadataPoint).x.toLocaleString()}
            </Typography>
            <Typography variant="body2">
              Value: {(closestPoint as MetadataPoint).originalY.toPrecision(3)}
            </Typography>
          </Box>
        )
  
        setTooltip({
          content: tooltipContent,
          x: mouseX + margin.left,
          y: mouseY + margin.top - 15,
        })
        return
      }
  
      setTooltip(null)
    },
    [metadataSeries, sharedChartProps.margin, theme, metadataColors]
  )

  const ScalesCaptureLayer = (props: { xScale: any; yScale: any }) => {
    const { xScale, yScale } = props
  
    if (xScale && yScale) {
      chartScalesRef.current = { xScale, yScale }
    }
  
    return null
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!chartScalesRef.current) return

    const rect = chartRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    if (
      mouseX < sharedChartProps.margin.left ||
      mouseX > rect.width - sharedChartProps.margin.right ||
      mouseY < sharedChartProps.margin.top ||
      mouseY > rect.height - sharedChartProps.margin.bottom
    ) {
      return
    }

    const { xScale } = chartScalesRef.current
    const adjustedMouseX = mouseX - sharedChartProps.margin.left
    const startDate = xScale.invert(adjustedMouseX)
    setZoomStart(startDate.getTime())
    setIsDragging(true)
  }
  
  const handleMouseMoveZoom = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !chartScalesRef.current) return

    const { xScale } = chartScalesRef.current
    const rect = chartRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = event.clientX - rect.left - sharedChartProps.margin.left
    const endDate = xScale.invert(mouseX)
    setZoomEnd(endDate.getTime())
  }
  
  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || zoomStart === null || zoomEnd === null) return

    const rect = chartRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    if (
      mouseX < sharedChartProps.margin.left ||
      mouseX > rect.width - sharedChartProps.margin.right ||
      mouseY < sharedChartProps.margin.top ||
      mouseY > rect.height - sharedChartProps.margin.bottom
    ) {
      setZoomStart(null)
      setZoomEnd(null)
      setIsDragging(false)
      return
    }

    const newStartDate = new Date(Math.min(zoomStart, zoomEnd))
    const newEndDate = new Date(Math.max(zoomStart, zoomEnd))

    setXScaleConfig({
      ...xScaleConfig,
      min: newStartDate,
      max: newEndDate,
    })

    setFromDate(newStartDate)
    setToDate(newEndDate)

    setZoomStart(null)
    setZoomEnd(null)
    setIsDragging(false)
  }

  const renderZoomOverlay = () => {
    if (!isDragging || zoomStart === null || zoomEnd === null || !chartScalesRef.current) return null

    const { xScale } = chartScalesRef.current
    const rect = chartRef.current?.getBoundingClientRect()
    if (!rect) return null

    const startX = xScale(new Date(Math.min(zoomStart, zoomEnd))) + sharedChartProps.margin.left
    const endX = xScale(new Date(Math.max(zoomStart, zoomEnd))) + sharedChartProps.margin.left

    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: startX,
          width: endX - startX,
          height: '100%',
          backgroundColor: theme.palette.primary.main,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
    )
  }

  const filteredData = useMemo(() => {
    if (!(xScaleConfig.min instanceof Date) || !(xScaleConfig.max instanceof Date)) {
      return mainSeries
    }

    return mainSeries.map((series) => ({
      ...series,
      data: series.data.filter(
        (point) =>
          xScaleConfig.min instanceof Date &&
          xScaleConfig.max instanceof Date &&
          point.x >= xScaleConfig.min &&
          point.x <= xScaleConfig.max
      ),
    }))
  }, [mainSeries, xScaleConfig])

  const filteredMetadata = useMemo(() => {
    if (!(xScaleConfig.min instanceof Date) || !(xScaleConfig.max instanceof Date)) {
      return metadataSeries
    }

    return metadataSeries.map((series) => ({
      ...series,
      data: series.data.filter(
        (point) =>
          xScaleConfig.min instanceof Date &&
          xScaleConfig.max instanceof Date &&
          point.x >= xScaleConfig.min &&
          point.x <= xScaleConfig.max
      ),
    }))
  }, [metadataSeries, xScaleConfig])

  const [selectedVariables, setSelectedVariables] = useState<string[]>(
    Object.keys(visibleLines).filter((key) => visibleLines[key] !== false)
  )

  const handleVariableChange = (event: SelectChangeEvent<typeof selectedVariables>) => {
    const {
      target: { value },
    } = event

    const newSelectedVariables = typeof value === 'string' ? value.split(',') : value

    setSelectedVariables(newSelectedVariables)

    setVisibleLines((prevState) => {
      const updatedVisibleLines = { ...prevState }
      Object.keys(updatedVisibleLines).forEach((key) => {
        updatedVisibleLines[key] = newSelectedVariables.includes(key)
      })
      return updatedVisibleLines
    })
  }

  const handleFromDateChange = (date: Date | null) => {
    if (date && toDate && date < toDate) {
      setFromDate(date)
      setXScaleConfig((prev) => ({
        ...prev,
        min: date,
      }))
    }
  }

  const handleToDateChange = (date: Date | null) => {
    if (date && fromDate && date > fromDate) {
      setToDate(date)
      setXScaleConfig((prev) => ({
        ...prev,
        max: date,
      }))
    }
  }

  const handleResetZoom = () => {
    setFromDate(initialXScaleConfig.min as Date)
    setToDate(initialXScaleConfig.max as Date)
    setXScaleConfig(initialXScaleConfig)
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

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl sx={{ flex: 1 }}>
          <InputLabel id="variable-select-label">Variables</InputLabel>
          <Select
            labelId="variable-select-label"
            id="variable-select"
            multiple
            value={selectedVariables}
            onChange={handleVariableChange}
            input={<OutlinedInput label="Variables" />}
            renderValue={(selected) => selected.join(', ')}
            MenuProps={MenuProps}
          >
            {selectedDataset?.data[0].slice(1).map((variable: string) => (
              <MenuItem key={variable} value={variable}>
                <Checkbox checked={selectedVariables.includes(variable)} />
                <ListItemText primary={variable} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <DateTimePicker
          label="From"
          value={fromDate}
          onChange={handleFromDateChange}
          slotProps={{
            textField: {
              fullWidth: true,
              variant: 'outlined',
              sx: { flex: 1 },
            },
          }}
        />

        <DateTimePicker
          label="To"
          value={toDate}
          onChange={handleToDateChange}
          slotProps={{
            textField: {
              fullWidth: true,
              variant: 'outlined',
              sx: { flex: 1 },
            },
          }}
        />

        <Box>
          <Button
          variant="contained"
          onClick={handleResetZoom}
          
        >
          Reset Zoom
          </Button>
          </Box>
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
          sx={{ height: '100%', width: '100%', position: 'relative' }}
          onMouseMove={(event) => handleMouseMove(event)}
          onMouseLeave={() => handleMouseLeave()}
          onMouseDown={handleMouseDown}
          onMouseMoveCapture={handleMouseMoveZoom}
          onMouseUp={handleMouseUp}
        >
          <ResponsiveLineCanvas
            data={filteredData.filter((d) => visibleLines[d.id] !== false)}
            pointSize={0}
            lineWidth={1}
            xFormat="time:%d.%m.%Y %H:%M"
            yScale={{
              type: 'linear',
              min: 0,
              max: 1,
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
            curve='basis'
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
            layers={[
              'grid',
              'markers',
              'axes',
              'areas',
              'lines',
              'points',
              MetadataScatterplotLayer,
              (props) => ScalesCaptureLayer(props),
              'slices',
              'mesh',
              'legends',
            ]}
            {...sharedChartProps}
            xScale={xScaleConfig}
          />
          {renderZoomOverlay()}
        </Box>

        {tooltip && (
          <Box
            sx={{
              position: 'absolute',
              top: tooltip.y,
              left: tooltip.x,
              pointerEvents: 'none',
              transform: 'translate(-50%, -100%)',
              zIndex: 10,
            }}
          >
            {tooltip.content}
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

const App: React.FC = () => {
  return (
<LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
<AnalyseTimeseries />
    </LocalizationProvider>
  )
}

export default App
