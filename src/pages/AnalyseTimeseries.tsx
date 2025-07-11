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
import SustainabilityBox from './SustainabilityBox'
import ProductivityBox from './ProductivityBox'

type MetadataPoint = {
  x: Date
  y: number
  originalY: number
  serieId: string
  unit: string
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
  const [downsampleWindow, setDownsampleWindow] = useState<number>(10)

  const dwString = selectedDataset?.type === "agroscope" ? "Metadata: DW" : "Metadata: Trockenmasse"

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

      setSelectedVariables(Object.keys(initialVisibleLines))
    }
  }, [selectedDataset])

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

    const metadataSeries: MetadataSeries[] = normalised
      .filter((d) => d.id.startsWith('Metadata:'))
      .map((d) => {
        let unit = ''
        if (selectedDataset?.metadata && typeof d.id === 'string') {
          const variableName = d.id.replace(/^Metadata: /, '')
          const idx = selectedDataset.metadata.data[0].indexOf(variableName)
          unit = idx >= 0 ? selectedDataset.metadata.data[1][idx] || '' : ''
        }
        return {
          ...d,
          data: d.data.map((point) => ({
            ...point,
            unit,
          })),
        }
      })
    const mainSeries = normalised.filter((d) => !d.id.startsWith('Metadata:'))

    return { metadataSeries, mainSeries }
  }, [selectedDataset])

  const theme = useTheme()

  const metadataColors = useMemo(() => {
    const colors = metadataSeries.reduce((acc, metadata, index) => {
      acc[metadata.id] = schemeSet1[index % schemeSet1.length]
      return acc
    }, {} as { [key: string]: string })
    colors[dwString] = theme.palette.secondary.main
    return colors
  }, [metadataSeries, theme])

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
    margin: { top: 20, right: 240, bottom: 40, left: 0 },
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
        const isCursorLeft = point.x < 100
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
              transform: isCursorLow ? isCursorLeft ? 'translateX(+50%)' : null : isCursorLeft ? 'translate(+50%,+150%)' : 'translateY(+150%)',
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

  const durationDays =
    fromDate && toDate
      ? (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
      : 0

  const MetadataScatterplotLayer = ({ ctx, xScale, yScale }: any) => {
    if (!xScale || !yScale) return

    ctx.save()

    filteredMetadata.forEach((metadata) => {
      metadata.data.forEach((point) => {
        const x = xScale(point.x)
        const y = yScale(point.y)

        ctx.beginPath()
        ctx.arc(x, y, 8, 0, 2 * Math.PI)
        ctx.fillStyle = metadata.id === dwString
          ? metadataColors[dwString] || theme.palette.secondary.main
          : metadataColors[metadata.id]
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

          let unit = ''
          if (
            selectedDataset?.metadata &&
            typeof metadata.id === 'string'
          ) {
            const variableName = metadata.id.replace(/^Metadata: /, '')
            const variableIndex = selectedDataset.metadata.data[0].indexOf(variableName)
            unit =
              variableIndex !== undefined && variableIndex >= 0
                ? selectedDataset.metadata.data[1][variableIndex]
                : ''
          }

          if (distance < 20 && distance < minDistance) {
            closestPoint = { x: point.x, y: point.y, originalY: point.originalY, serieId: metadata.id, unit }
            minDistance = distance
          }
        })
      })

      if (closestPoint) {
        const isCursorLow = mouseY > 100
        const isCursorLeft = mouseX < 100

        const tooltipContent = (
          <Box
            sx={{
              background: metadataColors[(closestPoint as MetadataPoint).serieId] || theme.palette.background.paper,
              borderRadius: '8px',
              padding: '8px',
              textAlign: 'left',
              transform: isCursorLow ? isCursorLeft ? 'translateX(+50%)' : null : isCursorLeft ? 'translate(+50%,+150%)' : 'translateY(+150%)',
            }}
          >
            <Typography color='black' variant="body2" sx={{ fontWeight: 'bold' }}>
              {(closestPoint as MetadataPoint).serieId} {(closestPoint as MetadataPoint).unit && `[${(closestPoint as MetadataPoint).unit}]`}
            </Typography>
            <Typography color='black' variant="body2">
              Time: {(closestPoint as MetadataPoint).x.toLocaleString()}
            </Typography>
            <Typography color='black' variant="body2">
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

    let filtered = mainSeries.map((series) => ({
      ...series,
      data: series.data.filter(
        (point) =>
          xScaleConfig.min instanceof Date &&
          xScaleConfig.max instanceof Date &&
          point.x >= xScaleConfig.min &&
          point.x <= xScaleConfig.max
      ),
    }))

    if (downsampleWindow > 1) {
      filtered = filtered.map(s => downsampleAverage(s, downsampleWindow))
    }

    return filtered
  }, [mainSeries, xScaleConfig, downsampleWindow])

  const filteredMetadata = useMemo(() => {
    if (!(xScaleConfig.min instanceof Date) || !(xScaleConfig.max instanceof Date)) {
      return metadataSeries
    }

    let filtered = metadataSeries.map((series) => ({
      ...series,
      data: series.data.filter(
        (point) =>
          xScaleConfig.min instanceof Date &&
          xScaleConfig.max instanceof Date &&
          point.x >= xScaleConfig.min &&
          point.x <= xScaleConfig.max
      ),
    }))

    filtered = filtered.sort((a, b) => {
      if (a.id === dwString) return 1
      if (b.id === dwString) return -1
      return 0
    })

    return filtered
  }, [metadataSeries, xScaleConfig, dwString])

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

  const MetadataProductivityLineLayer = ({ xScale, yScale, ctx }: any) => {
    const dwSeries = filteredMetadata.find(series =>
      series.id === dwString
    )
    if (!dwSeries || !dwSeries.data.length) return

    ctx.save()
    ctx.strokeStyle = metadataColors[dwString] || theme.palette.secondary.main
    ctx.lineWidth = 5
    ctx.beginPath()

    const points = dwSeries.data.map(point => [xScale(point.x), yScale(point.y)])

    if (points.length > 1) {
      ctx.moveTo(points[0][0], points[0][1])
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1]
        const p1 = points[i]
        const p2 = points[i + 1]
        const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1]

        const cp1x = p1[0] + (p2[0] - p0[0]) / 6
        const cp1y = p1[1] + (p2[1] - p0[1]) / 6
        const cp2x = p2[0] - (p3[0] - p1[0]) / 6
        const cp2y = p2[1] - (p3[1] - p1[1]) / 6

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1])
      }
    }

    ctx.stroke()
    ctx.restore()
  }

  function getCatmullRomSplinePoints(points: [number, number][], step = 0.05) {
    if (points.length < 2) return points
    const spline: [number, number][] = []
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1]
      for (let t = 0; t < 1; t += step) {
        const tt = t * t
        const ttt = tt * t
        const x =
          0.5 *
          ((2 * p1[0]) +
            (-p0[0] + p2[0]) * t +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * tt +
            (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * ttt)
        const y =
          0.5 *
          ((2 * p1[1]) +
            (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * tt +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * ttt)
        spline.push([x, y])
      }
    }
    spline.push(points[points.length - 1]) // Ensure last point
    return spline
  }

  // In your component, after filteredMetadata is defined:

  const dwSeriesFull = metadataSeries.find(series => series.id === dwString)

  const productivityFittedPoints = useMemo(() => {
    if (!dwSeriesFull || !dwSeriesFull.data.length) return []
    return getCatmullRomSplinePoints(
      dwSeriesFull.data.map(point => [point.x.getTime(), point.originalY])
    ).map(([x, y]) => ({
      x: new Date(x),
      y,
    }))
  }, [dwSeriesFull])

  const visibleFittedPoints = useMemo(() => {
    if (!productivityFittedPoints.length || !(xScaleConfig.min instanceof Date) || !(xScaleConfig.max instanceof Date)) {
      return productivityFittedPoints
    }
    const filtered =
      typeof xScaleConfig.min === 'object' &&
      xScaleConfig.min instanceof Date &&
      typeof xScaleConfig.max === 'object' &&
      xScaleConfig.max instanceof Date
        ? productivityFittedPoints.filter(
            p => p.x >= xScaleConfig.min! && p.x <= xScaleConfig.max!
          )
        : productivityFittedPoints
    return filtered.length > 0 ? filtered : productivityFittedPoints
  }, [productivityFittedPoints, xScaleConfig.min, xScaleConfig.max])

  const firstFitted = visibleFittedPoints[0]?.y ?? 0
  const lastFitted = visibleFittedPoints[visibleFittedPoints.length - 1]?.y ?? 0

  const co2ColumnName = selectedDataset?.type === 'agroscope' ? 'CO2' : 'FLOW.OF.CO2'
  let co2Sum = 0

  if (
    selectedDataset &&
    selectedDataset.data &&
    xScaleConfig.min instanceof Date &&
    xScaleConfig.max instanceof Date
  ) {
    const colIdx = selectedDataset.data[0].indexOf(co2ColumnName)
    if (colIdx !== -1) {
      co2Sum = selectedDataset.data
        .slice(2) // skip header rows
        .filter(row => {
          const date = new Date(row[0])
          if (!(xScaleConfig.min instanceof Date) || !(xScaleConfig.max instanceof Date)) {
            return false
          }
          return date >= xScaleConfig.min && date <= xScaleConfig.max
        })
        .map(row => parseFloat(row[colIdx]))
        .filter(val => !isNaN(val))
        .reduce((sum, val) => sum + val, 0)
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

        <FormControl sx={{ minWidth: 120, alignSelf: 'stretch' }}>
          <InputLabel id="downsample-select-label">Downsampling</InputLabel>
          <Select
            labelId="downsample-select-label"
            id="downsample-select"
            value={downsampleWindow}
            label="Downsample"
            onChange={e => setDownsampleWindow(Number(e.target.value))}
          >
            <MenuItem value={1}>None</MenuItem>
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={50}>50</MenuItem>
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
            color='secondary'
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
          axisLeft={null}
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
              anchor: 'bottom-right',
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
            MetadataProductivityLineLayer,
            MetadataScatterplotLayer,
            (props) => ScalesCaptureLayer(props),
            'slices',
            'mesh',
            'legends',
          ]}
          {...sharedChartProps}
          xScale={xScaleConfig}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 0,
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <SustainabilityBox
            type={selectedDataset?.type || 'agroscope'}
            durationDays={durationDays}
            co2Sum={co2Sum}
          />
          {metadataSeries.length === 0 ? null : <ProductivityBox type={selectedDataset?.type || 'agroscope'} durationDays={durationDays} firstFitted={firstFitted} lastFitted={lastFitted} />}
        </Box>
        {renderZoomOverlay()}

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

const App: React.FC = () => {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
      <AnalyseTimeseries />
    </LocalizationProvider>
  )
}

export default App

function downsampleAverage<T extends { data: { x: Date; y: number; originalY: number; serieId: string }[] }>(series: T, windowSize = 10): T {
  const { data, ...rest } = series
  if (data.length <= windowSize) return series

  const downsampled: typeof data = []
  for (let i = 0; i < data.length; i += windowSize) {
    const window = data.slice(i, i + windowSize)
    if (window.length === 0) continue
    // Average y and originalY, use the x of the middle point
    const avgY = window.reduce((sum, p) => sum + p.y, 0) / window.length
    const avgOriginalY = window.reduce((sum, p) => sum + p.originalY, 0) / window.length
    const mid = Math.floor(window.length / 2)
    downsampled.push({
      ...window[mid],
      y: avgY,
      originalY: avgOriginalY,
    })
  }
  return { ...rest, data: downsampled } as T
}
