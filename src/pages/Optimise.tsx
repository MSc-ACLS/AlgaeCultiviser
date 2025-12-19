import { Box, Typography, FormControl, Tooltip, IconButton, Button, CircularProgress, InputAdornment } from '@mui/material'
import InputLabel from '@mui/material/InputLabel'
import OutlinedInput from '@mui/material/OutlinedInput'
import DownloadForOfflineTwoToneIcon from '@mui/icons-material/DownloadForOfflineTwoTone'
import { ResponsiveLineCanvas, PointTooltipProps } from '@nivo/line'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../store'
import { useRef, useState } from 'react'
import CubicSpline from 'cubic-spline'
import { useTheme } from '@mui/material/styles'
import { handleDownloadChart } from '../utils/downloadChart'
import OptimiserMetricsBox from './OptimiserMetricsBox'

const Optimise: React.FC = () => {
  const datasets = useSelector((state: RootState) => state.data.datasets)
  const selectedDatasetId = useSelector((state: RootState) => state.data.selectedDatasetId)
  const selectedDataset = selectedDatasetId !== null ? datasets.find(dataset => dataset.id === selectedDatasetId) : null

  // Transform data into the required format
  const transformedSeries = selectedDataset ? transformDataForOptimiser(selectedDataset) : null

  console.log('Transformed Data:', transformedSeries)

  // Transformed data is available for debugging when needed

  const dispatch = useDispatch()
  const chartRef = useRef<HTMLDivElement>(null)

  const currentTheme = useSelector((state: RootState) => state.theme)

  // Function to transform the data into the required format
  function transformDataForOptimiser(dataset: any) {
    if (!dataset.data || !dataset.metadata) {
      console.warn('Missing data or metadata in dataset:', dataset)
      return null;
    }

    // dataset and metadata headers are available if needed for debugging

    const headers = dataset.data[0];
    const timeIndex = headers.indexOf('timestring');

    if (timeIndex === -1) {
      console.warn('Could not find timestring column in data headers')
      return null;
    }
    // column indices for PAR/T/flow will be computed after reactor type is known
    let par1Index = -1
    let par2Index = -1
    let tempIndex = -1
    //let flowIndex = -1
    const data = dataset.data.slice(2);  // Skip headers and units

    // Helper to format a Date into local 'YYYY-MM-DD HH:mm:ss' string
    const formatLocalKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

    const metadataData = dataset.metadata.data.slice(2);  // Skip headers and units
    const metadataTimeIndex = dataset.metadata.data[0].indexOf('timestring')

    // Determine reactor type and corresponding column names
    console.log('Dataset type:', dataset.type)
    console.log('Dataset:', dataset)

    const isAgroscope = dataset.type === 'agroscope'
    const dryWeightColumn = isAgroscope ? 'DW' : 'Trockenmasse'
    // ZHAW uses the column name "N added"
    const nh4nColumn = isAgroscope ? 'NH4-N' : 'N added'

    const dryWeightIndex = dataset.metadata.data[0].indexOf(dryWeightColumn)
    const nh4nIndex = dataset.metadata.data[0].indexOf(nh4nColumn)

    // Determine data column indices for PAR, temperature and flow depending on reactor type
    if (isAgroscope) {
      par1Index = headers.indexOf('PAR')
      par2Index = -1
      tempIndex = headers.indexOf('Tempterature')
      //flowIndex = headers.indexOf('CO2')
    } else {
      par1Index = headers.indexOf('PAR.1')
      par2Index = headers.indexOf('PAR.2')
      tempIndex = headers.indexOf('TEMPERATURE')
      //flowIndex = headers.indexOf('FLOW.OF.ALGAE')
    }

    if (dryWeightIndex === -1) {
      console.warn(`Could not find ${dryWeightColumn} column in metadata headers`)
      return null;
    }

    // Helper function for better spline interpolation
    function getCubicSplinePoints(points: [number, number][], step = 0.05) {
      if (points.length < 2) {
        console.warn('Need at least 2 points for interpolation')
        return points // Return original points if we can't interpolate
      }

      const xs = points.map(p => p[0])
      const ys = points.map(p => p[1])

      if (xs.length !== ys.length || xs.some(x => x === undefined) || ys.some(y => y === undefined)) {
        console.warn('Invalid points array - contains undefined values')
        return points
      }

      const minX = xs[0]
      const maxX = xs[xs.length - 1]

      try {
        const spline = new CubicSpline(xs, ys)
        const fitted: [number, number][] = []
        // Add more points for smoother interpolation
        for (let x = minX; x < maxX; x += (maxX - minX) * step) {
          fitted.push([x, spline.at(x)])
        }
        fitted.push([maxX, spline.at(maxX)]) // Ensure last point
        return fitted
      } catch (error) {
        console.warn('Error creating spline:', error)
        return points // Return original points if spline creation fails
      }
    }

    // Build metadata maps for dry weight and NH4-N
    let metaPoints: [number, number][] = []
    const nh4nMap = new Map<string, number>();
    let nh4nFoundCount = 0;

    metadataData.forEach((row: any[]) => {
      const timeStr = row[metadataTimeIndex]
      const dryWeightVal = parseFloat(row[dryWeightIndex])
      const nh4nVal = nh4nIndex !== -1 ? parseFloat(row[nh4nIndex]) : 0

      // More detailed validation
      if (!timeStr) {
        console.warn('Missing timestamp in metadata row:', row)
        return
      }

      try {
        const mdDate = new Date(timeStr)
        if (isNaN(mdDate.getTime())) {
          console.warn('Invalid date string in metadata:', timeStr)
          return
        }

        // Handle dry weight
        if (!isNaN(dryWeightVal)) {
          metaPoints.push([mdDate.getTime(), dryWeightVal])
        } else {
          console.warn(`Invalid ${dryWeightColumn} value in metadata row:`, row)
        }

        // Handle NH4-N
        if (nh4nIndex !== -1) {
          // NH4-N value processed (counted below if valid)

          if (!isNaN(nh4nVal)) {
            // Round to nearest hour for NH4-N
            const roundedTime = Math.round(mdDate.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000)
            const roundedDate = new Date(roundedTime)
            const key = formatLocalKey(roundedDate)
            nh4nMap.set(key, nh4nVal)
            nh4nFoundCount++
          }
        } else {
          if (nh4nFoundCount === 0) {
            console.warn('NH4-N column not found')
          }
        }
      } catch (error) {
        console.warn('Error parsing date:', timeStr, error)
      }
    })

    if (metaPoints.length === 0) {
      console.warn('No valid metadata points found!')
      return null
    }

    // Find start of current run - but look at the actual values more carefully
    // Treat zero or very small values (< 0.1) as potential run starts
    metaPoints.sort((a, b) => a[0] - b[0])
    const possibleStarts = metaPoints.filter(([, v]) => v < 0.1)

    // Find the last "zero" before our final value to ensure we get the right run
    const finalPoint = metaPoints[metaPoints.length - 1]
    const relevantStart = possibleStarts.filter(([t]) => t <= finalPoint[0]).pop()

    if (relevantStart) {
      // Filter to only include points from this run start onwards
      metaPoints = metaPoints.filter(([t]) => t >= relevantStart[0])
      console.debug('Found run start:', new Date(relevantStart[0]), 'with value:', relevantStart[1])
    }    // Generate a smooth spline through the metadata points for better interpolation
    const interpolatedPoints = getCubicSplinePoints(metaPoints)

    // Rebuild metadataMap with the interpolated points, rounding timestamps to full hours
    const metadataMap = new Map<string, { X: number }>();
    interpolatedPoints.forEach(([ts, v]) => {
      const d = new Date(ts)
      // Round to nearest hour rather than always up - this gives better alignment
      const roundedTime = Math.round(d.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000)
      d.setTime(roundedTime)
      const localKey = formatLocalKey(d)

      // Only update if we don't already have a value or if our new value is closer 
      // to the exact hour (prevents double-updates at boundaries)
      const existingEntry = metadataMap.get(localKey)
      if (!existingEntry) {
        metadataMap.set(localKey, { X: v })
      }
    })

    // metadata points available in `metaPoints` if inspection is necessary

    let spline: any = null
    let splineMin = 0
    let splineMax = 0
    if (metaPoints.length >= 2) {
      const xs = metaPoints.map(([x]) => x)
      const ys = metaPoints.map(([, y]) => y)
      // debug: ensure xs are sorted and show a few points
      // console.debug('metaPoints sample', metaPoints.slice(0, 5))
      spline = new CubicSpline(xs, ys)
      splineMin = Math.min(...xs)
      splineMax = Math.max(...xs)
      // debug: check spline at a couple of points
      // console.debug('splineMin/max', splineMin, splineMax, 'sample at min/max', spline.at(splineMin), spline.at(splineMax))
    }

    // Process time series data
    const processedData = data
      .filter((row: any[]) => {
        // Parse the date and check local minutes (keep full hours in local time)
        const time = new Date(row[timeIndex]);
        return time.getMinutes() === 0;  // Only keep full hours, using local time
      })
      .map((row: any[]) => row) // placeholder, we'll build below
    // Now build processedData ensuring we fill X via spline and enforce non-decreasing
    // Start lastX at 0 (Trockenmasse should default to 0 until measurements/spline provide values)
    let lastX = 0
    const built = processedData.map((row: any[]) => {
      const timeStr = new Date(row[timeIndex]);
      const formattedTime = formatLocalKey(timeStr);

      // Calculate PAR (I). Agroscope has a single 'PAR' column; ZHAW has PAR.1 and PAR.2
      let I = 0
      if (isAgroscope) {
        const p = parseFloat(row[par1Index])
        I = isNaN(p) ? 0 : p
      } else {
        const p1 = parseFloat(row[par1Index])
        const p2 = parseFloat(row[par2Index])
        const vals: number[] = []
        if (!isNaN(p1)) vals.push(p1)
        if (!isNaN(p2)) vals.push(p2)
        I = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      }

      // Determine X: prefer exact metadata (rounded to hour), else spline if available and in range,
      // else keep previous value. Only enforce non-decreasing when we're carrying forward the last
      // value (i.e. we don't have an exact metadata value nor a spline value).
      let X = 0
      const metaExact = metadataMap.get(formattedTime)
      let usedSpline = false
      let usedMetaExact = false
      if (metaExact) {
        X = metaExact.X
        usedMetaExact = true
      } else if (spline && timeStr.getTime() >= splineMin && timeStr.getTime() <= splineMax) {
        const val = spline.at(timeStr.getTime())
        // Only use spline value if it's reasonable (not too far from surrounding measurements)
        if (!isNaN(val) && val >= 0 && val <= Math.max(...metaPoints.map(([, y]) => y)) * 1.1) {
          X = val
          usedSpline = true
        } else {
          // fallback to carrying lastX
          X = lastX
        }
      } else {
        // Find the last metadata point and if we're at/after it, use its value, else carry lastX
        const lastMetaPoint = metaPoints[metaPoints.length - 1]
        if (lastMetaPoint && timeStr.getTime() >= lastMetaPoint[0]) {
          X = lastMetaPoint[1]
        } else {
          X = lastX
        }
      }

      // enforce non-decreasing only when we carried the previous value (no metaExact and no spline)
      if (!usedMetaExact && !usedSpline && X < lastX) X = lastX
      lastX = X

      // Get NH4-N value for this time or use 0
      const uN = nh4nMap.get(formattedTime) || 0

      return {
        time: formattedTime,
        X,
        I,
        T: parseFloat(row[tempIndex]),
        uN,
      }
    })

    // use built as processedData
    const finalData = built

    // debug/diagnostic logging removed to reduce console noise

    return {
      series: finalData,
      // Rest of the configuration will be added later
    };
  }

  const theme = useTheme()

  const handleDownload = async () => {
    await handleDownloadChart(chartRef, 'correlations-chart.png', currentTheme, dispatch)
  }

  // --- Optimiser Config State ---
  const [config, setConfig] = useState({
    smooth_window: 5,
    smooth_poly: 3,
    dt_hours: 1.0,
  })
  const [bounds, setBounds] = useState({
    I: [0.0, 300.0],
    T: [15.0, 30.0],
    //flow: [0.0, 1.5],
    N: [0.0, 2.0],
  })
  const [horizon, setHorizon] = useState({
    H_min: 12,
    H_max: 48,
    H_step: 6,
  })
  const isAgroscope = selectedDataset?.type === 'agroscope'
  const [impact, setImpact] = useState({
    c_I: isAgroscope ? 23.8 : 0,
    c_T: isAgroscope ? 17.3 : 40.5,
    facility: isAgroscope ? 8.75 : 8.48,
    c_N: isAgroscope ? 20.3 : 1.6
  })

  // --- Optimiser Request State ---
  // Result type definition for better type safety
  type OptimiserScheduleEntry = {
    hour: number
    I: number
    T: number
    N: number
    X_next: number
    impact_per_hour: number
  }

  type OptimiserResult = {
    ok: boolean
    detail: string
    trace: string
    theta: number[]
    best_H: number
    report: {
      success: boolean
      message: string
      objective: number
      X_end: number
      gap: number
      impact_total: number
      impact_per_g: number
      n_iter: number
    }
    X0: number
    X_target: number
    total_impact: number
    schedule: OptimiserScheduleEntry[]
  }

  const [result, setResult] = useState<string | OptimiserResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  console.log('Result: ', result)

  // --- Form Handlers ---
  // const handleConfigChange = (key: keyof typeof config, value: number) => {
  //   setConfig(prev => ({ ...prev, [key]: value }))
  // }
  const handleBoundsChange = (key: keyof typeof bounds, idx: 0 | 1, value: number) => {
    setBounds(prev => ({ ...prev, [key]: prev[key].map((v, i) => i === idx ? value : v) }))
  }
  const handleImpactChange = (key: keyof typeof impact, value: number) => {
    setImpact(prev => ({ ...prev, [key]: value }))
  }
  const handleHorizonChange = (key: keyof typeof horizon, value: number) => {
    setHorizon(prev => ({ ...prev, [key]: value }))
  }

  // Typed event handlers for inputs
  // const handleConfigInput = (key: keyof typeof config) => (e: React.ChangeEvent<HTMLInputElement>) => {
  //   handleConfigChange(key, Number(e.target.value))
  // }
  const handleBoundsInput = (key: keyof typeof bounds, idx: 0 | 1) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleBoundsChange(key, idx, Number(e.target.value))
  }
  const handleImpactInput = (key: keyof typeof impact) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImpactChange(key, Number(e.target.value))
  }
  const handleHorizonInput = (key: keyof typeof horizon) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleHorizonChange(key, Number(e.target.value))
  }

  // --- Build Payload and Send ---
  async function sendPayload() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const payload = {
        ...transformedSeries,
        config,
        bounds,
        horizon,
        impact,
      }
      console.log('Sending payload:', payload)
      const isLocal = window.location.hostname === 'localhost'
      const apiUrl = isLocal
        ? '/mirco/api/optimizer.php'  // Local development
        : 'https://acls.ulozezoz.myhostpoint.ch/mirco/api/optimizer.php'

      // Use CORS proxy in production only
      const finalUrl = isLocal ? apiUrl : 'https://corsproxy.io/?' + encodeURIComponent(apiUrl)

      const res = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        ...(isLocal ? { credentials: 'include' } : {}),  // Include credentials only for local development
        body: JSON.stringify(payload),
      })
      const text = await res.text()
      try {
        const json = JSON.parse(text)
        setResult(json)
      } catch {
        setResult(text)
      }
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant='h5' sx={{ mb: 2 }}>Optimise</Typography>

      {/* --- Optimiser Config Form (4 columns, each with 2-row layout) --- */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {/* Config Column */}
        {/* <Box sx={{ flex: 1 }}>
          <Typography variant='subtitle1' sx={{ mb: 1 }}>Config</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, Math.ceil(3 / 2))}, 1fr)`, gap: 1 }}>
            <FormControl>
              <InputLabel shrink>Window</InputLabel>
              <OutlinedInput type='number' value={config.smooth_window} onChange={handleConfigInput('smooth_window')} />
            </FormControl>
            <FormControl>
              <InputLabel shrink>Poly</InputLabel>
              <OutlinedInput type='number' value={config.smooth_poly} onChange={handleConfigInput('smooth_poly')} />
            </FormControl>
            <FormControl>
              <InputLabel shrink>dt (hours)</InputLabel>
              <OutlinedInput type='number' value={config.dt_hours} onChange={handleConfigInput('dt_hours')} />
            </FormControl>
          </Box>
        </Box> */}

        {/* Bounds Column */}
        <Box sx={{ flex: 2 }}>
          <Typography variant='subtitle1' sx={{ mb: 1 }}>Bounds</Typography>
            {(() => {
            const entries = Object.entries(bounds)
            const cols = Math.max(1, Math.ceil(entries.length / 2))
            return (
              <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 1 }}>
                {entries.map(([key, val]) => {
                  let unit = ''
                  if (key === 'I') unit = 'µmol/m²/s'
                  if (key === 'T') unit = '°C'
                  if (key === 'N') unit = 'mL/h'

                  return (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1 }}>
                        <FormControl sx={{ width: '50%' }}>
                          <InputLabel shrink>{key}-Min</InputLabel>
                          <OutlinedInput
                            type='number'
                            value={val[0]}
                            onChange={handleBoundsInput(key as keyof typeof bounds, 0)}
                            label='Min'
                            endAdornment={unit ? <InputAdornment position='end'>{unit}</InputAdornment> : undefined}
                          />
                        </FormControl>
                        <FormControl sx={{ width: '50%' }}>
                          <InputLabel shrink>{key}-Max</InputLabel>
                          <OutlinedInput
                            type='number'
                            value={val[1]}
                            onChange={handleBoundsInput(key as keyof typeof bounds, 1)}
                            label='Max'
                            endAdornment={unit ? <InputAdornment position='end'>{unit}</InputAdornment> : undefined}
                          />
                        </FormControl>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            )
          })()}
        </Box>

        {/* Horizon Column */}
        <Box sx={{ flex: 1 }}>
          <Typography variant='subtitle1' sx={{ mb: 1 }}>Horizon</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, Math.ceil(3 / 2))}, 1fr)`, gap: 1 }}>
            <FormControl>
              <InputLabel shrink>Min</InputLabel>
              <OutlinedInput
                type='number'
                value={horizon.H_min}
                onChange={handleHorizonInput('H_min')}
                label='Min'
                endAdornment={<InputAdornment position='end'>h</InputAdornment>}
              />
            </FormControl>
            <FormControl>
              <InputLabel shrink>Max</InputLabel>
              <OutlinedInput
                type='number'
                value={horizon.H_max}
                onChange={handleHorizonInput('H_max')}
                label='Max'
                endAdornment={<InputAdornment position='end'>h</InputAdornment>}
              />
            </FormControl>
            <FormControl>
              <InputLabel shrink>Step</InputLabel>
              <OutlinedInput
                type='number'
                value={horizon.H_step}
                onChange={handleHorizonInput('H_step')}
                label='Step'
                endAdornment={<InputAdornment position='end'>h</InputAdornment>}
              />
            </FormControl>
          </Box>
        </Box>

        {/* Impact Column */}
        <Box sx={{ flex: 1 }}>
          <Typography variant='subtitle1' sx={{ mb: 1 }}>Impact (CO<sub>2</sub>-eq/g)</Typography>
          {(() => {
            const entries = Object.entries(impact)
            const cols = Math.max(1, Math.ceil(entries.length / 2))
            return (
              <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 1 }}>
                {entries.map(([key, val]) => {
                  let unit = ''
                  // if (key === 'c_I') unit = 'per µmol/m²/s'
                  // if (key === 'c_T') unit = 'per °C'
                  // if (key === 'c_N') unit = 'per mL/h'

                  return (
                    <FormControl key={key}>
                      <InputLabel shrink>{key}</InputLabel>
                      <OutlinedInput
                        type='number'
                        value={val}
                        onChange={handleImpactInput(key as keyof typeof impact)}
                        label={key}
                        endAdornment={unit ? <InputAdornment position='end'>{unit}</InputAdornment> : undefined}
                      />
                    </FormControl>
                  )
                })}
              </Box>
            )
          })()}
        </Box>
        <Box sx={{ mb: 2, alignItems: 'center', display: 'flex' }}>
          <Button variant='contained' color='secondary' onClick={sendPayload} disabled={loading || !transformedSeries}>
            Calculate
          </Button>
          {error && (
            <Typography color='error' variant='body2' sx={{ mt: 1 }}>{error}</Typography>
          )}
        </Box>
      </Box>


      {/* --- Optimiser Result --- */}
      <Box sx={{ flex: 1, width: '100%', overflow: 'hidden', position: 'relative' }} ref={chartRef}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
            <CircularProgress size={20} />
            <Typography>Requesting optimiser...</Typography>
          </Box>
        ) : result ? (
          typeof result === 'string' ? (
            <Typography variant='body2' component='pre' sx={{ whiteSpace: 'pre-wrap', p: 2 }}>{result}</Typography>
          ) : !result.ok ? (
            <Box sx={{ p: 2 }}>
              <Typography color="error" variant="h6" sx={{ mb: 1 }}>Optimization Error</Typography>
              <Typography color="error" variant="body1" sx={{ mb: 2 }}>{result.detail || 'Unknown error'}</Typography>
              {result.trace && (
                <Typography component="pre" sx={{
                  whiteSpace: 'pre-wrap',
                  bgcolor: theme.palette.background.paper,
                  p: 2,
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  fontSize: '0.875rem'
                }}>
                  {result.trace}
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ height: '100%', width: '100%' }}>
              <ResponsiveLineCanvas
                data={(() => {
                  // Calculate min/max for each variable
                  const minMax = {
                    X_next: {
                      min: Math.min(...result.schedule.map(d => d.X_next)),
                      max: Math.max(...result.schedule.map(d => d.X_next))
                    },
                    I: {
                      min: Math.min(...result.schedule.map(d => d.I)),
                      max: Math.max(...result.schedule.map(d => d.I))
                    },
                    T: {
                      min: Math.min(...result.schedule.map(d => d.T)),
                      max: Math.max(...result.schedule.map(d => d.T))
                    },
                    N: {
                      min: Math.min(...result.schedule.map(d => d.N)),
                      max: Math.max(...result.schedule.map(d => d.N))
                    }
                  }

                  // Helper function to normalize a value
                  const normalize = (value: number, min: number, max: number) =>
                    max === min ? 0.5 : (value - min) / (max - min)

                  return [
                    {
                      id: 'X_next (g/L)',
                      data: result.schedule.map(d => ({
                        x: d.hour,
                        y: normalize(d.X_next, minMax.X_next.min, minMax.X_next.max),
                        originalY: d.X_next
                      }))
                    },
                    {
                      id: 'I (µmol/m²/s)',
                      data: result.schedule.map(d => ({
                        x: d.hour,
                        y: normalize(d.I, minMax.I.min, minMax.I.max),
                        originalY: d.I
                      }))
                    },
                    {
                      id: 'T (°C)',
                      data: result.schedule.map(d => ({
                        x: d.hour,
                        y: normalize(d.T, minMax.T.min, minMax.T.max),
                        originalY: d.T
                      }))
                    },
                    {
                      id: 'uN (mL/h)',
                      data: result.schedule.map(d => ({
                        x: d.hour,
                        y: normalize(d.N, minMax.N.min, minMax.N.max),
                        originalY: d.N
                      }))
                    }
                  ]
                })()}
                margin={{ top: 20, right: 240, bottom: 60, left: 20 }}
                enableGridX={false}
                enableGridY={false}

                xScale={{
                  type: 'linear',
                  min: 'auto',
                  max: 'auto'
                }}
                yScale={{
                  type: 'linear',
                  min: 'auto',
                  max: 'auto',
                }}
                axisLeft={null}
                tooltip={({ point }: PointTooltipProps) => {
                  const isCursorLow = (point as any).y > 100
                  const isCursorLeft = (point as any).x < 100
                  const originalY = (point.data as any)?.originalY ?? point.data.y
                  const formatVal = (v: any) => {
                    if (v === null || v === undefined) return 'N/A'
                    const n = Number(v)
                    return isNaN(n) ? String(v) : n.toFixed(2)
                  }

                  return (
                    <Box
                      sx={{
                        background: (point.serieColor as string) || theme.palette.background.paper,
                        borderRadius: '8px',
                        padding: '8px',
                        textAlign: 'left',
                        transform: isCursorLow ? (isCursorLeft ? 'translateX(+50%)' : undefined) : (isCursorLeft ? 'translate(+50%,+150%)' : 'translateY(+150%)'),
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {point.serieId}
                      </Typography>
                      <Typography variant="body2">
                        Hour: {Number(point.data.x).toFixed(0)}
                      </Typography>
                      <Typography variant="body2">Value: {formatVal(originalY)}</Typography>
                    </Box>
                  )
                }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Hour',
                  legendOffset: 36,
                  legendPosition: 'middle'
                }}
                pointSize={4}
                pointColor={{ theme: 'background' }}
                colors={{ scheme: 'category10' }}
                curve='basis'
                enablePoints={true}
                legends={[
                  {
                    anchor: 'bottom-right',
                    direction: 'column',
                    justify: false,
                    translateX: 100,
                    translateY: 0,
                    itemsSpacing: 0,
                    itemDirection: 'left-to-right',
                    itemWidth: 80,
                    itemHeight: 20,
                    itemOpacity: 0.75,
                    symbolSize: 12,
                    symbolShape: 'circle',
                    symbolBorderColor: 'rgba(0, 0, 0, .5)',
                    effects: [
                      {
                        on: 'hover',
                        style: {
                          itemBackground: 'rgba(0, 0, 0, .03)',
                          itemOpacity: 1
                        }
                      }
                    ]
                  }
                ]}
                theme={{
                  text: {
                    fontSize: 11,
                    fill: theme.palette.text.primary,
                    outlineWidth: 0,
                    outlineColor: 'transparent'
                  },
                  axis: {
                    domain: {
                      line: {
                        stroke: 'transparent',
                        strokeWidth: 0
                      }
                    },
                    ticks: {
                      line: {
                        stroke: theme.palette.text.primary,
                        strokeWidth: 1
                      },
                      text: {
                        fill: theme.palette.text.primary
                      }
                    },
                    legend: {
                      text: {
                        fill: theme.palette.text.primary
                      }
                    }
                  },
                  tooltip: {
                    container: {
                      background: theme.palette.background.paper,
                      color: theme.palette.text.primary,
                      fontSize: 12
                    }
                  }
                }}
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
                <OptimiserMetricsBox
                  horizon={result.best_H}
                  impact_total={result.report.impact_total}
                  gap={result.report.gap}
                />
              </Box>
            </Box>

          )
        ) : (
          <Typography variant='body2' sx={{ p: 2 }}>No result yet.</Typography>
        )}
        <Tooltip title={'Download Chart as PNG'}>
          <IconButton
            onClick={handleDownload}
            sx={{ position: 'absolute', bottom: 10, right: 10, zIndex: 10 }}
            color='secondary'
          >
            <DownloadForOfflineTwoToneIcon fontSize='large' />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default Optimise
