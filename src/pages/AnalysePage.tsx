import { Box, Typography, FormControlLabel, Checkbox } from '@mui/material'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { ResponsiveLineCanvas } from '@nivo/line'
import { useState, useMemo, useEffect } from 'react'

const AnalysePage: React.FC = () => {
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

  // Transform the data for the Nivo chart
  const data = useMemo(() => {
    if (!selectedDataset) return []
    return selectedDataset.data[0].map((variable: string, index: number) => ({
      id: variable,
      data: selectedDataset.data.slice(1).map((row: any[], rowIndex: number) => ({
        x: rowIndex,
        y: row[index] === "NA" || isNaN(row[index]) ? null : row[index], // Replace "NA" or invalid values with null
      })),
    }))
  }, [selectedDataset])

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant='h5' sx={{ mb: 2 }}>Analyse</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'row', mb: 2, flexWrap: 'wrap' }}>
        {selectedDataset &&
          selectedDataset.data[0].map((variable: string) => (
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
          xScale={{ type: 'point' }}
          yScale={{
            type: 'linear',
            min: 'auto',
            max: 'auto',
            stacked: false,
            reverse: false,
          }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 0,
            tickPadding: 5,
            legend: 'Index',
            legendOffset: 30,
            legendPosition: 'middle',
            tickValues: data[0]?.data
              ? Array.from({ length: 10 }, (_, i) => Math.floor((i * data[0].data.length) / 10))
              : [],
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 5,
            legend: 'Value',
            legendOffset: -40,
            legendPosition: 'middle',
          }}
          colors={[
            "#00796b",
            "#228e78",
            "#3aa384",
            "#52b890",
            "#6ace9b",
            "#84e4a5",
            "#a0f9af",
            "#9ff79c",
            "#a2f488",
            "#a7f073",
            "#aeec5b",
            "#b6e740",
            "#c0e218",
          ]}
          enableGridX={false}
          enableGridY={false}
          pointSize={0}
          legends={[
            {
              anchor: 'right',
              direction: 'column',
              justify: false,
              translateX: 100,
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
            const isCursorLow = point.y > 100 // Adjust this threshold based on your graph's scale
            return (
              <Box
                sx={{
                  background: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  padding: '8px',
                  textAlign: 'left',
                  transform: isCursorLow ? 'translateY(0)' : 'translateY(+150%)',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {point.serieId}
                </Typography>
                <Typography variant="body2">Time: {(point.data.xFormatted || point.data.x)?.toString()}</Typography>
                <Typography variant="body2">Value: {(point.data.yFormatted || point.data.y)?.toString()}</Typography>
              </Box>
            )
          }}
        />
      </Box>
    </Box>
  )
}

export default AnalysePage
