import { Box, Typography, useTheme } from "@mui/material"
import { co2AgroscopeFactors, co2ZHAWFactors, reactorAgroscopeFactor, reactorZHAWFactor } from "../data/model"
import { DatasetType } from "../features/dataSlice"

interface SustainabilityBoxProps {
    type: DatasetType
}

const SustainabilityBox: React.FC<SustainabilityBoxProps> = ({ type }) => {
    const theme = useTheme()

    const co2Factors = type === 'agroscope' ? co2AgroscopeFactors : co2ZHAWFactors
    const reactorFactor = type === 'agroscope' ? reactorAgroscopeFactor : reactorZHAWFactor

    const sustainabilityMetrics = {
        eletricity: reactorFactor.annual_electricity_input_kWh
    }

    return ( 
        <Box
            sx={{
                position: 'absolute',
                top: 8,
                right: 0,
                width: 180,
                height: 200,
                bgcolor: theme.palette.secondary.main,
                padding: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
            }}
        >
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                Sustainability
            </Typography>
            <Typography variant="body2">
                Emissions from Electricity: {sustainabilityMetrics.eletricity} co2eq
            </Typography>
        </Box>
    )
}

export default SustainabilityBox