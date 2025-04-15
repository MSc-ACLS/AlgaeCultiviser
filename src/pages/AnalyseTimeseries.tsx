import { Box, Typography, FormControlLabel, Checkbox } from '@mui/material'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { ResponsiveLineCanvas } from '@nivo/line'
import { useState, useMemo, useEffect } from 'react'
import { parse, isValid } from 'date-fns'
import { useTheme } from '@mui/material/styles'

const AnalyseTimeseries: React.FC = () => {
  const datasets = useSelector((state: RootState) => state.data.datasets)
  const selectedDatasetId = useSelector((state: RootState) => state.data.selectedDatasetId)
  const selectedDataset = selectedDatasetId !== null ? datasets.find(dataset => dataset.id === selectedDatasetId) : null

  const [visibleLines, setVisibleLines] = useState<{ [key: string]: boolean }>({})

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

  const normalizeData = (data: any[]) => {
    const normalizedData = data.map((variableData: { id: string; data: { x: Date; y: number }[] }) => {
      const yValues = variableData.data.map((point) => point.y).filter((y) => y !== null)
      const min = Math.min(...yValues)
      const max = Math.max(...yValues)

      return {
        id: variableData.id,
        data: variableData.data.map((point) => {
          if (!point.x || isNaN(point.x.getTime()) || point.y === null) {
            console.warn(`Invalid normalized point skipped: x=${point.x}, y=${point.y}`)
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

    return normalizedData
  }

  const data = useMemo(() => {
    if (!selectedDataset) return []

    const rawData = selectedDataset.data[0].slice(1).map((variable: string, index: number) => ({
      id: variable,
      data: selectedDataset.data.slice(2).map((row) => {
        const x = row[0]
        const y = row[index + 1] === 'NA' || isNaN(row[index + 1]) ? null : row[index + 1]

        // Detect if the date is already in ISO format
        const isISODate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x)

        let parsedDate
        if (isISODate) {
          // Parse ISO date directly
          parsedDate = new Date(x)
        } else {
          // Normalize the date to ensure milliseconds are valid
          const normalizedDate = x.trim().replace(/(\.\d{1,2})$/, (match: string) => match.padEnd(4, '0'))

          // Parse the date using date-fns
          parsedDate = parse(normalizedDate, 'dd.MM.yyyy HH:mm:ss.SSS', new Date())
        }

        if (!isValid(parsedDate) || y === null) {
          console.warn(`Invalid data point skipped: raw=${x}, parsed=${parsedDate}`)
          return null
        }

        return { x: parsedDate, y }
      }).filter((point) => point !== null), // Filter out invalid points
    }))

    console.log('Parsed raw data:', rawData)
    return normalizeData(rawData)
  }, [selectedDataset])

  const theme = useTheme()

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant='h5' sx={{ mb: 2 }}>Time</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'row', mb: 2, flexWrap: 'wrap' }}>
        {selectedDataset &&
          selectedDataset.data[0].slice(1).map((variable: string) => ( // Skip the first column
            <FormControlLabel
              key={variable}
              control={
                <Checkbox
                  checked={visibleLines[variable] !== false}
                  onChange={() => handleCheckboxChange(variable)}
                />
              }
              label={variable}
            />
          ))}
      </Box>

      <Box
        sx={{
          flex: 1,
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <ResponsiveLineCanvas
          data={data.filter((d: { id: string }) => visibleLines[d.id] !== false)}
          margin={{ top: 100, right: 200, bottom: 40, left: 50 }}
          xScale={{
            type: 'time',
            format: '%Y-%m-%dT%H:%M:%S.%LZ',
            precision: 'minute',
          }}
          xFormat='time:%d.%m.%Y %H:%M'
          yScale={{
            type: 'linear',
            min: 'auto',
            max: 'auto',
            stacked: false,
            reverse: false,
          }}
          axisBottom={{
            tickSize: 0,
            tickPadding: 5,
            legend: 'Time',
            legendOffset: 30,
            legendPosition: 'middle',
            format: '%d.%m.%Y %H:%M',
            tickValues: 5,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 5,
            legend: 'Norm. Value',
            legendOffset: -40,
            legendPosition: 'middle',
          }}
          colors={{ scheme: 'category10' }}
          curve='natural'
          enableGridX={false}
          enableGridY={false}
          pointSize={0}
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
          tooltip={({ point }) => {
            const isCursorLow = point.y > 100
            const originalY = (point.data as any).originalY

            // Get the unit for the current variable (point.serieId)
            const variableIndex = selectedDataset?.data[0].indexOf(point.serieId) // Find the index of the variable
            const unit = variableIndex !== undefined && variableIndex >= 0 ? selectedDataset?.data[1][variableIndex] : '' // Get the unit from the second row

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
                <Typography variant='body2' sx={{ fontWeight: 'bold' }}>
                  {point.serieId} {unit && `[${unit}]`}
                </Typography>
                <Typography variant='body2'>Time: {new Date(point.data.x).toLocaleString()}</Typography>
                <Typography variant='body2'>Value: {originalY?.toString()}</Typography>
              </Box>
            )
          }}
          theme={{
            axis: {
              ticks: {
                text: {
                  fill: theme.palette.text.primary,
                },
              },
              legend: {
                text: {
                  fill: theme.palette.text.primary,
                },
              },
            },
          }}
        />
      </Box>
    </Box>
  )
}

export default AnalyseTimeseries
