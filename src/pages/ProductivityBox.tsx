import { Box, Typography, useTheme } from '@mui/material'
import { DatasetType } from '../features/dataSlice'

interface ProductivityBoxProps {
    type: DatasetType
    durationDays: number
}

const ProductivityBox: React.FC<ProductivityBoxProps> = ({ type, durationDays }) => {
    const theme = useTheme()

    const arealProductivity = 1
    const volumetricProductivity = 1

    const productivityMetrics = [
        {
            name: 'Areal Productivity',
            value: arealProductivity,
        },
        {
            name: 'Volumetric Productivity',
            value: volumetricProductivity,
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
            <Typography color='white' variant='subtitle2' sx={{ fontWeight: 'bold', mb: 1 }}>
                Productivity ({durationDays.toPrecision(2)} days)
            </Typography>

            {productivityMetrics.filter(metric => metric.value !== 0).map((metric, idx) => (
                <Typography
                    color='white'
                    key={idx}
                    variant='body2'
                    component='div'
                >
                    {metric.name} {metric.value.toFixed(2)} g/L
                </Typography>
            ))}
        </Box>
    )
}

export default ProductivityBox