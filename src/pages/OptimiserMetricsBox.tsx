import { Box, Typography, useTheme } from '@mui/material'

interface OptimiserMetricsBoxProps {
    horizon: number
    xFinal: number
    gap: number
}

const OptimiserMetricsBox: React.FC<OptimiserMetricsBoxProps> = ({ horizon, xFinal, gap }) => {
    const theme = useTheme()

    const OptimiserMetrics = [
        {
            name: 'Horizon',
            value: horizon,
            unit: 'hours'
        },
        {
            name: 'Final Biomass',
            value: xFinal,
            unit: 'g/L'
        },
        {
            name: 'Saved CO<sub>2</sub>',
            value: gap,
            unit: 'g/L'
        }
    ]

    return (
        <Box
            sx={{
                width: 220,
                bgcolor: theme.palette.secondary.main,
                padding: 1,
                borderRadius: 1,
                boxShadow: 3,
            }}
        >
            <Typography color='black' variant='subtitle2' sx={{ fontWeight: 'bold', mb: 1 }}>
                Optimisation Metrics
            </Typography>

            {OptimiserMetrics.filter(metric => metric.value !== 0).map((metric, idx) => (
                <Typography
                    color='black'
                    key={idx}
                    variant='body2'
                    component='div'
                >
                    <span dangerouslySetInnerHTML={{ __html: metric.name }} />: {metric.name === 'Horizon' ? metric.value :  metric.value.toFixed(2)} {metric.unit}
                </Typography>
            ))}
        </Box>
    )
}

export default OptimiserMetricsBox