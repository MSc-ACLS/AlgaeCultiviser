import { Box, Typography, FormControl, Select, MenuItem, SelectChangeEvent, Tooltip, IconButton, Button, CircularProgress } from '@mui/material'
import InputLabel from '@mui/material/InputLabel'
import OutlinedInput from '@mui/material/OutlinedInput'
import Checkbox from '@mui/material/Checkbox'
import ListItemText from '@mui/material/ListItemText'
import DownloadForOfflineTwoToneIcon from '@mui/icons-material/DownloadForOfflineTwoTone'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../store'
import { useRef, useState, useEffect } from 'react'
import CubicSpline from 'cubic-spline'
import { useTheme } from '@mui/material/styles'
import { handleDownloadChart } from '../utils/downloadChart'

const Optimise: React.FC = () => {
  const datasets = useSelector((state: RootState) => state.data.datasets)
  const selectedDatasetId = useSelector((state: RootState) => state.data.selectedDatasetId)
  const selectedDataset = selectedDatasetId !== null ? datasets.find(dataset => dataset.id === selectedDatasetId) : null

  // Transform data into the required format
  const transformedData = selectedDataset ? transformDataForOptimizer(selectedDataset) : null
  
  console.log('Transformed Data:', transformedData)
  
  const dispatch = useDispatch()
  const chartRef = useRef<HTMLDivElement>(null)
  
  const currentTheme = useSelector((state: RootState) => state.theme)

  // Function to transform the data into the required format
  function transformDataForOptimizer(dataset: any) {
    if (!dataset.data || !dataset.metadata) {
      console.warn('Missing data or metadata in dataset:', dataset)
      return null;
    }

    console.log('Dataset headers:', dataset.data[0])
    console.log('Metadata headers:', dataset.metadata.data[0])

    const headers = dataset.data[0];
    const timeIndex = headers.indexOf('timestring');
    
    if (timeIndex === -1) {
      console.warn('Could not find timestring column in data headers')
      return null;
    }
  // compute column indices once
  const par1Index = headers.indexOf('PAR.1');
  const par2Index = headers.indexOf('PAR.2');
  const tempIndex = headers.indexOf('TEMPERATURE');
  const flowIndex = headers.indexOf('FLOW.OF.ALGAE');
    const data = dataset.data.slice(2);  // Skip headers and units

    // Helper to format a Date into local 'YYYY-MM-DD HH:mm:ss' string
    const formatLocalKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

    const metadataData = dataset.metadata.data.slice(2);  // Skip headers and units
    const metadataTimeIndex = dataset.metadata.data[0].indexOf('timestring');
    const trockenmassIndex = dataset.metadata.data[0].indexOf('Trockenmasse');

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

    // Build raw metadata points (timestamp in ms, value)
    let metaPoints: [number, number][] = []
    metadataData.forEach((row: any[]) => {
      const timeStr = row[metadataTimeIndex]
      const val = parseFloat(row[trockenmassIndex])
      
      // More detailed validation
      if (!timeStr) {
        console.warn('Missing timestamp in metadata row:', row)
        return
      }
      
      if (isNaN(val)) {
        console.warn('Invalid Trockenmasse value in metadata row:', row)
        return
      }
      
      try {
        const mdDate = new Date(timeStr)
        if (isNaN(mdDate.getTime())) {
          console.warn('Invalid date string in metadata:', timeStr)
          return
        }
        metaPoints.push([mdDate.getTime(), val])
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

    // Debug: show metadata points
    console.debug('Metadata points:', metaPoints.map(([t, v]) => ({
      time: new Date(t).toISOString(),
      value: v
    })))

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

      // Calculate average PAR (I)
      const I = (parseFloat(row[par1Index]) + parseFloat(row[par2Index])) / 2;

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

      return {
        time: formattedTime,
        X,
        I,
        T: parseFloat(row[tempIndex]),
        flow: parseFloat(row[flowIndex]),
        uN: 0,
      }
    })

    // use built as processedData
    const finalData = built

    // Debug info to help diagnose spline/X issues
    try {
      console.debug('Optimise: metadata headers', dataset.metadata.data[0])
      console.debug('Optimise: metadata indices time/trocken', metadataTimeIndex, trockenmassIndex)
      console.debug('Optimise: metaPoints sample', metaPoints.slice(0, 10).map(([t, v]) => [new Date(t).toString(), v]))
  console.debug('Optimise: first processedData times', processedData.slice(0, 5).map((r: any) => r[timeIndex]))
      console.debug('Optimise: column indices par1/par2/temp/flow', par1Index, par2Index, tempIndex, flowIndex)
    } catch (e) {
      // ignore
    }

    return {
      data: finalData,
      // Rest of the configuration will be added later
    };
  }

  const theme = useTheme()

  const handleDownload = async () => {
    await handleDownloadChart(chartRef, 'correlations-chart.png', currentTheme, dispatch)
  }

  // --- Optimizer Config State ---
  const [config, setConfig] = useState({
    smooth_window: 5,
    smooth_poly: 3,
    dt_hours: 1.0,
  })
  const [bounds, setBounds] = useState({
    I: [0.0, 300.0],
    T: [15.0, 30.0],
    flow: [0.0, 1.5],
    uN: [0.0, 3.0],
  })
  const [H_candidates, setH_candidates] = useState([12, 18, 24])
  const [impact, setImpact] = useState({
    c_I: 1.0,
    c_T: 1.0,
    c_flow: 1.0,
    c_uN: 1.0,
  })

  // --- Optimizer Request State ---
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // --- Form Handlers ---
  const handleConfigChange = (key: keyof typeof config, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }
  const handleBoundsChange = (key: keyof typeof bounds, idx: 0 | 1, value: number) => {
    setBounds(prev => ({ ...prev, [key]: prev[key].map((v, i) => i === idx ? value : v) }))
  }
  const handleImpactChange = (key: keyof typeof impact, value: number) => {
    setImpact(prev => ({ ...prev, [key]: value }))
  }
  const handleHChange = (values: number[]) => {
    setH_candidates(values)
  }

  // Typed event handlers for inputs
  const handleConfigInput = (key: keyof typeof config) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleConfigChange(key, Number(e.target.value))
  }
  const handleBoundsInput = (key: keyof typeof bounds, idx: 0 | 1) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleBoundsChange(key, idx, Number(e.target.value))
  }
  const handleImpactInput = (key: keyof typeof impact) => (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImpactChange(key, Number(e.target.value))
  }

  // --- Build Payload and Send ---
  async function sendPayload() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const payload = {
        ...transformedData,
        config,
        bounds,
        H_candidates,
        impact,
      }
      const res = await fetch('/mirco/api/optimizer.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      {/* --- Optimizer Config Form (4 columns, each with 2-row layout) --- */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {/* Config Column */}
        <Box sx={{ flex: 1}}>
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
        </Box>

        {/* Bounds Column */}
        <Box sx={{ flex: 1.5}}>
          <Typography variant='subtitle1' sx={{ mb: 1 }}>Bounds</Typography>
          {(() => {
            const entries = Object.entries(bounds)
            const cols = Math.max(1, Math.ceil(entries.length / 2))
            return (
              <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 1 }}>
                {entries.map(([key, val]) => (
                  <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ minWidth: 30, flexShrink: 0 }}>
                      <Typography variant='body1' sx={{ textAlign: 'left' }}>{key}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1 }}>
                      <FormControl sx={{ width: '50%' }}>
                        <InputLabel shrink>Min</InputLabel>
                        <OutlinedInput type='number' value={val[0]} onChange={handleBoundsInput(key as keyof typeof bounds, 0)} label='Min' />
                      </FormControl>
                      <FormControl sx={{ width: '50%' }}>
                        <InputLabel shrink>Max</InputLabel>
                        <OutlinedInput type='number' value={val[1]} onChange={handleBoundsInput(key as keyof typeof bounds, 1)} label='Max' />
                      </FormControl>
                    </Box>
                  </Box>
                ))}
              </Box>
            )
          })()}
        </Box>

        {/* H_candidates Column */}
        <Box sx={{ flex: 0.75}}>
          <Typography variant='subtitle1' sx={{ mb: 1 }}>Horizon Candidates</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, Math.ceil(1 / 2))}, 1fr)`, gap: 1 }}>
            <FormControl>
              <InputLabel shrink>Hours</InputLabel>
              <Select
                multiple
                value={H_candidates}
                onChange={e => handleHChange(typeof e.target.value === 'string' ? e.target.value.split(',').map(Number) : e.target.value as number[])}
                input={<OutlinedInput />}
                renderValue={selected => (selected as number[]).join(', ')}
              >
                {[12, 18, 24, 36, 48].map(val => (
                  <MenuItem key={val} value={val}>
                    <Checkbox checked={H_candidates.includes(val)} />
                    <ListItemText primary={val} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Impact Column */}
        <Box sx={{ flex: 1}}>
          <Typography variant='subtitle1' sx={{ mb: 1 }}>Impact</Typography>
          {(() => {
            const entries = Object.entries(impact)
            const cols = Math.max(1, Math.ceil(entries.length / 2))
            return (
              <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 1 }}>
                {entries.map(([key, val]) => (
                  <FormControl key={key}>
                    <InputLabel shrink>{key}</InputLabel>
                    <OutlinedInput type='number' value={val} onChange={handleImpactInput(key as keyof typeof impact)} />
                  </FormControl>
                ))}
              </Box>
            )
          })()}
        </Box>
        <Box sx={{ mb: 2, alignItems: 'center', display: 'flex' }}>
          <Button variant='contained' color='secondary' onClick={sendPayload} disabled={loading || !transformedData}>
            Calculate
          </Button>
          {error && (
            <Typography color='error' variant='body2' sx={{ mt: 1 }}>{error}</Typography>
          )}
        </Box>
      </Box>


      {/* --- Optimizer Result --- */}
      <Box sx={{ flex: 1, width: '100%', overflow: 'hidden', position: 'relative' }} ref={chartRef}>
        <Box sx={{ height: '100%', width: '100%', p: 2, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography>Requesting optimizer...</Typography>
            </Box>
          ) : result ? (
            typeof result === 'string' ? (
              <Typography variant='body2' component='pre' sx={{ whiteSpace: 'pre-wrap' }}>{result}</Typography>
            ) : (
              <pre style={{ color: theme.palette.text.primary, whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
            )
          ) : (
            <Typography variant='body2'>No result yet.</Typography>
          )}
        </Box>
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
