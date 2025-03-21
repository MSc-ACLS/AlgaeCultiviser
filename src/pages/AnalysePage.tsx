import { Box, Typography, FormControlLabel, Checkbox } from '@mui/material'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { ResponsiveLine } from '@nivo/line'
import { useState, useMemo } from 'react'

const AnalysePage: React.FC = () => {
  const datasets = useSelector((state: RootState) => state.data.datasets)
  const selectedDatasetId = useSelector((state: RootState) => state.data.selectedDatasetId)
  const selectedDataset = selectedDatasetId !== null ? datasets.find(dataset => dataset.id === selectedDatasetId) : null

  // Initialize visibleLines with the first 3 variables set to true
  const initialVisibleLines = useMemo(() => {
    if (!selectedDataset) return {}
    return selectedDataset.data[0].reduce((acc: { [key: string]: boolean }, variable: string, index: number) => {
      acc[variable] = index < 3 // Activate only the first 3 variables
      return acc
    }, {})
  }, [selectedDataset])

  const [visibleLines, setVisibleLines] = useState<{ [key: string]: boolean }>(initialVisibleLines)

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
        y: row[index], // Use raw values without filtering
      })),
    }))
  }, [selectedDataset])

  return (
    <Box
      sx={{
        height: '100%', // Take up the full height provided by the parent
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Title */}
      <Typography variant='h5' sx={{ mb: 2 }}>Analyse</Typography>

      {/* Checkboxes */}
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

      {/* Graph Container */}
      <Box
        sx={{
          flex: 1, // Take up the remaining space
          width: '100%', // Full width
          overflow: 'hidden', // Prevent overflow
        }}
      >
        <ResponsiveLine
          data={data.filter((d: { id: string }) => visibleLines[d.id] !== false)}
          margin={{ top: 20, right: 20, bottom: 40, left: 40 }} // Reduced margins for better performance
          xScale={{ type: 'point' }}
          yScale={{
            type: 'linear',
            min: 'auto',
            max: 'auto',
            stacked: false,
            reverse: false,
          }}
          axisTop={null} // Remove the top axis
          axisRight={null} // Remove the right axis
          axisBottom={{
            tickSize: 0, // Remove tick lines
            tickPadding: 5,
            legend: 'Index',
            legendOffset: 36,
            legendPosition: 'middle',
          }}
          axisLeft={{
            tickSize: 0, // Remove tick lines
            tickPadding: 5,
            legend: 'Value',
            legendOffset: -40,
            legendPosition: 'middle',
          }}
          colors={{ scheme: 'paired' }}
          enableGridX={false} // Disable vertical grid lines
          enableGridY={false} // Disable horizontal grid lines
          pointSize={4} // Reduce point size for better performance
          pointColor={{ theme: 'background' }}
          pointBorderWidth={1}
          pointBorderColor={{ from: 'serieColor' }}
          useMesh={true} // Keep mesh for interactivity
          legends={[]} // Remove legends for better performance
        />
      </Box>
    </Box>
  )
}

export default AnalysePage
