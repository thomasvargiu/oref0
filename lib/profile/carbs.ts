import type { FinalResult } from '../bin/utils'
import { console_error } from '../bin/utils'
import getTime from '../medtronic-clock'
import type { CarbRatioSchedule, Profile } from '../types/Profile'

interface Inputs {
    carbratio?: {
        schedule?: CarbRatioSchedule[]
        units: 'grams' | 'exchanges' | string
    }
}

export default function carbRatioLookup(final_result: FinalResult, inputs: Inputs, _profile?: Profile) {
    const now = new Date()
    const carbratio_data = inputs.carbratio
    const carbratio_schedule = carbratio_data?.schedule
    if (typeof carbratio_data !== 'undefined' && carbratio_schedule) {
        if (carbratio_data.units === 'grams' || carbratio_data.units === 'exchanges') {
            //carbratio_data.schedule.sort(function (a, b) { return a.offset > b.offset });
            let carbRatio = carbratio_schedule[carbratio_schedule.length - 1]

            for (let i = 0; i < carbratio_schedule.length - 1; i++) {
                if (
                    now.getTime() >= getTime(carbratio_schedule[i].offset) &&
                    now.getTime() < getTime(carbratio_schedule[i + 1].offset)
                ) {
                    carbRatio = carbratio_schedule[i]
                    // disallow impossibly high/low carbRatios due to bad decoding
                    if (carbRatio.ratio < 3 || carbRatio.ratio > 150) {
                        console_error(final_result, `Error: carbRatio of ${carbRatio} out of bounds.`)
                        return
                    }
                    break
                }
            }
            if (carbratio_data.units === 'exchanges') {
                carbRatio.ratio = 12 / carbRatio.ratio
            }
            return carbRatio.ratio
        } else {
            console_error(final_result, `Error: Unsupported carb_ratio units ${carbratio_data.units}`)
            return
        }
        //return carbRatio.ratio;
        //profile.carbratio = carbRatio.ratio;
    } else {
        return
    }
}

carbRatioLookup.carbRatioLookup = carbRatioLookup
exports = module.exports = carbRatioLookup
