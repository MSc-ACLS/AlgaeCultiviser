import { Box, Typography, useTheme } from '@mui/material'
import { DatasetType } from '../features/dataSlice'

interface ProductivityBoxProps {
    type: DatasetType
    durationDays: number
    firstFitted: number
    lastFitted: number
}

const ProductivityBox: React.FC<ProductivityBoxProps> = ({ type, durationDays, firstFitted, lastFitted }) => {
    const theme = useTheme()

    const area = type === 'agroscope' ? 2.84 : 18
    const volume = type === 'agroscope' ? 235 : 200

    const totalGramsProduced = (lastFitted - firstFitted) * volume
    const arealProductivity = totalGramsProduced / (area * durationDays)
    const volumetricProductivity = (lastFitted - firstFitted) / durationDays

    const productivityMetrics = [
        {
            name: 'Areal Productivity',
            value: arealProductivity,
            unit: 'g/m²/day'
        },
        {
            name: 'Volumetric Productivity',
            value: volumetricProductivity,
            unit: 'g/L/day'
        }
    ]

    return (
        <Box
            sx={{
                width: 180,
                bgcolor: theme.palette.secondary.main,
                padding: 1,
                borderRadius: 1,
                boxShadow: 3,
            }}
        >
            <Typography color='black' variant='subtitle2' sx={{ fontWeight: 'bold', mb: 1 }}>
                Productivity ({durationDays.toPrecision(2)} days)
            </Typography>

            {productivityMetrics.filter(metric => metric.value !== 0).map((metric, idx) => (
                <Typography
                    color='black'
                    key={idx}
                    variant='body2'
                    component='div'
                >
                    {metric.name} {metric.value.toFixed(2)} {metric.unit}
                </Typography>
            ))}
        </Box>
    )
}

export default ProductivityBox