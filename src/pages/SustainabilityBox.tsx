import { Box, Typography, useTheme } from '@mui/material'
import { co2AgroscopeFactors, co2ZHAWFactors, reactorAgroscopeFactor, reactorZHAWFactor } from '../data/model'
import { DatasetType } from '../features/dataSlice'

interface SustainabilityBoxProps {
    type: DatasetType
    durationDays: number
    co2Sum: number
}

const SustainabilityBox: React.FC<SustainabilityBoxProps> = ({ type, durationDays, co2Sum }) => {
    const theme = useTheme()

    console.log('CO2 Sum:', co2Sum)

    const co2Factors = type === 'agroscope' ? co2AgroscopeFactors : co2ZHAWFactors
    const reactorFactor = type === 'agroscope' ? reactorAgroscopeFactor : reactorZHAWFactor

    // Electricity
    const electricityFactor = co2Factors.find(f => f.name === 'Electricity')
    const electricityKWh = reactorFactor.annual_electricity_input_kWh * durationDays / 365
    const electricityCO2eq = electricityKWh * (electricityFactor ? electricityFactor.kco2eq : 0)

    // CO2
    // const co2Factor = co2Factors.find(f => f.name === 'CO2')
    // const co2input = reactorFactor.annual_CO2_input_kg * durationDays / 365
    // const co2CO2eq = co2input * (co2Factor ? co2Factor.kco2eq : 0)

    // Real CO2
    const realCo2Factor = co2Factors.find(f => f.name === 'CO2')
    const realCo2CO2eq = co2Sum * 0.00196 * (type === 'zhaw' ? 10 : 1) * (realCo2Factor ? realCo2Factor.kco2eq : 0)

    // Ammonium Sulfate
    const ammoniumSulfateFactor = co2Factors.find(f => f.name === 'Ammonium Sulfate')
    const ammoniumSulfateInput = reactorFactor.nutrients.N_total_kg_per_a * 4.716 * durationDays / 365
    const ammoniumSulfateCO2eq = ammoniumSulfateInput * (ammoniumSulfateFactor ? ammoniumSulfateFactor.kco2eq : 0)

    // CTP Reactor
    const ctpReactorFactor = co2Factors.find(f => f.name === 'CTP Reactor')
    const ctpReactorCO2eq = (ctpReactorFactor ? ctpReactorFactor.kco2eq : 0) * durationDays / (365 * 20)

    // OTP Reactor
    const otpReactorFactor = co2Factors.find(f => f.name === 'OTP Reactor')
    const otpReactorCO2eq = (otpReactorFactor ? otpReactorFactor.kco2eq : 0) * durationDays / (365 * 25)

    // Sodium Hypochlorite
    const sodiumHypochloriteFactor = co2Factors.find(f => f.name === 'Sodium Hypochlorite')
    const sodiumHypochloriteInput = reactorFactor.reactor_volume_l * 0.1 * durationDays / 365
    const sodiumHypochloriteCO2eq = sodiumHypochloriteInput * (sodiumHypochloriteFactor ? sodiumHypochloriteFactor.kco2eq : 0)

    const sustainabilityMetrics = [
        {
            name: 'Electricity',
            value: electricityCO2eq,
        },
        // {
        //     name: 'CO<sub>2</sub>',
        //     value: co2CO2eq,
        // },
        {
            name: 'CO<sub>2</sub>',
            value: realCo2CO2eq,
        },
        {
            name: '(NH<sub>4</sub>)<sub>2</sub>SO<sub>4</sub>',
            value: ammoniumSulfateCO2eq,
        },
        {
            name: 'CTP Reactor',
            value: ctpReactorCO2eq,
        },
        {
            name: 'OTP Reactor',
            value: otpReactorCO2eq,
        },
        {
            name: 'Sodium Hypochlorite',
            value: sodiumHypochloriteCO2eq,
        }
    ]

    return (
        <Box
            sx={{
                width: 180,
                bgcolor: theme.palette.primary.main,
                padding: 1,
                borderRadius: 1,
                boxShadow: 3,
            }}
        >
            <Typography color='white' variant='subtitle2' sx={{ fontWeight: 'bold', mb: 1 }}>
                Emissions ({durationDays.toPrecision(2)} days)
            </Typography>

            {sustainabilityMetrics.filter(metric => metric.value !== 0).map((metric, idx) => (
                <Typography
                    color='white'
                    key={idx}
                    variant='body2'
                    component='div'
                >
                    <span dangerouslySetInnerHTML={{ __html: metric.name }} />: {metric.value.toFixed(2)} kg CO<sub>2</sub>e
                </Typography>
            ))}
        </Box>
    )
}

export default SustainabilityBox