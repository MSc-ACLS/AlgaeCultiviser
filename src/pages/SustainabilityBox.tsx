import { Box, Typography, useTheme } from "@mui/material"
import { co2AgroscopeFactors, co2ZHAWFactors, reactorAgroscopeFactor, reactorZHAWFactor } from "../data/model"
import { DatasetType } from "../features/dataSlice"

interface SustainabilityBoxProps {
    type: DatasetType
    durationDays: number
}

const SustainabilityBox: React.FC<SustainabilityBoxProps> = ({ type, durationDays }) => {
    const theme = useTheme()

    const co2eText = <>CO<sub>2</sub>e</>

    const co2Factors = type === 'agroscope' ? co2AgroscopeFactors : co2ZHAWFactors
    const reactorFactor = type === 'agroscope' ? reactorAgroscopeFactor : reactorZHAWFactor

    // Electricity
    const electricityFactor = co2Factors.find(f => f.name === 'Electricity')

    const electricityKWh = reactorFactor.annual_electricity_input_kWh * durationDays / 365
    
    const electricityCO2eq = electricityKWh * (electricityFactor ? electricityFactor.kco2eq : 0)

    // CO2
    const co2Factor = co2Factors.find(f => f.name === 'CO2')

    const co2input = reactorFactor.annual_CO2_input_kg * durationDays / 365

    const co2CO2eq = co2input * (co2Factor ? co2Factor.kco2eq : 0)

    // Ammonium Sulfate
    const ammoniumSulfateFactor = co2Factors.find(f => f.name === 'Ammonium Sulfate')
    
    const ammoniumSulfateInput = reactorFactor.nutrients.N_total_kg_per_a * 4.716 * durationDays / 365

    const ammoniumSulfateCO2eq = ammoniumSulfateInput * (ammoniumSulfateFactor ? ammoniumSulfateFactor.kco2eq : 0)

    const sustainabilityMetrics = {
        electricity: electricityCO2eq,
        co2: co2CO2eq,
        ammoniumSulfate: ammoniumSulfateCO2eq
    }

    return ( 
        <Box
            sx={{
                position: 'absolute',
                top: 8,
                right: 0,
                width: 180,
                height: 200,
                bgcolor: theme.palette.primary.main,
                padding: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                borderRadius: 1,
                boxShadow: 3,
            }}
        >
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Emissions ({durationDays.toPrecision(2)} days)
            </Typography>
            <Typography variant="body2">
                Electricity: {sustainabilityMetrics.electricity.toFixed(2)} {co2eText}
            </Typography>
            <Typography variant="body2">
                CO<sub>2</sub>: {sustainabilityMetrics.co2.toFixed(2)} {co2eText}
            </Typography>
            <Typography variant="body2">
                (NH<sub>4</sub>)<sub>2</sub>SO<sub>4</sub>: {sustainabilityMetrics.ammoniumSulfate.toFixed(2)} {co2eText}
            </Typography>
        </Box>
    )
}

export default SustainabilityBox