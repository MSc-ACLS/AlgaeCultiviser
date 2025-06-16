import co2AgroscopeJSON from './factors/co2_agroscope.json'
import co2ZHAWJSON from './factors/co2_zhaw.json'
import reactorAgroscopeJSON from './factors/reactor_agroscope.json'
import reactorZHAWJSON from './factors/reactor_zhaw.json'

export interface co2Factor {
    name: string
    unit: string,
    description: string
    kco2eq: number
}

export const co2AgroscopeFactors: ReadonlyArray<co2Factor> =
    co2AgroscopeJSON as ReadonlyArray<co2Factor>

export const co2ZHAWFactors: ReadonlyArray<co2Factor> =
    co2ZHAWJSON as ReadonlyArray<co2Factor>

export interface reactorFactor {
    system: string,
    reactor_volume_l: number,
    areal_productivity_rate_g_m2_d: number,
    productive_area_m2: number,
    operation_time_d_per_a: number,
    annual_production_algae_biomass_kg: number,
    protein_content_percent: number,
    annual_production_protein_kg: number,
    annual_CO2_input_kg: number,
    annual_electricity_input_kWh: number,
    nutrients: {
        N_total_kg_per_a:number,
        N_in_biomass_kg:number,
        N_in_biomass_percent:number,
        N_losses_to_air_percent:number | null,
        N_losses_to_water_percent:number | null,
    }
}

export const reactorAgroscopeFactor: Readonly<reactorFactor> = reactorAgroscopeJSON as reactorFactor

export const reactorZHAWFactor: Readonly<reactorFactor> = reactorZHAWJSON as reactorFactor