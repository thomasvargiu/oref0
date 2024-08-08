import type { FinalResult } from '../bin/utils'
import { console_error } from '../bin/utils'
import getTime from '../medtronic-clock'
import type { Profile } from '../types/Profile'

interface BgTarget {
    offset: number
    low: number
    high: number
    min_bg?: number
    max_bg?: number
    temptargetSet?: boolean
}

interface TempTarget {
    created_at: string
    duration: number
    targetTop: number
    targetBottom: number
}

interface LookupInputs {
    targets: {
        targets: BgTarget[]
    }
    temptargets: TempTarget[]
}

export function bgTargetsLookup(final_result: FinalResult, inputs: LookupInputs, profile: Profile) {
    return bound_target_range(lookup(final_result, inputs, profile))
}

export function lookup(final_result: FinalResult, inputs: LookupInputs, profile: Profile) {
    const bgtargets_data = inputs.targets
    let temptargets_data = inputs.temptargets
    const now = new Date()

    //bgtargets_data.targets.sort(function (a, b) { return a.offset > b.offset });

    let bgTargets = bgtargets_data.targets[bgtargets_data.targets.length - 1]

    for (let i = 0; i < bgtargets_data.targets.length - 1; i++) {
        if (
            now.getTime() >= getTime(bgtargets_data.targets[i].offset) &&
            now.getTime() < getTime(bgtargets_data.targets[i + 1].offset)
        ) {
            bgTargets = bgtargets_data.targets[i]
            break
        }
    }

    if (profile.target_bg) {
        bgTargets.low = profile.target_bg
    }

    bgTargets.high = bgTargets.low

    let tempTargets = bgTargets

    if (!Array.isArray(temptargets_data)) {
        console_error(final_result, 'No temptargets found.')
        return bgTargets
    } else {
        // sort tempTargets by date so we can process most recent first
        temptargets_data = [...temptargets_data].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    }

    //console.error(temptargets_data);
    //console.error(now);
    for (let i = 0; i < temptargets_data.length; i++) {
        const start = new Date(temptargets_data[i].created_at)
        //console.error(start);
        const expires = new Date(start.getTime() + temptargets_data[i].duration * 60 * 1000)
        //console.error(expires);
        if (now >= start && temptargets_data[i].duration === 0) {
            // cancel temp targets
            //console.error(temptargets_data[i]);
            tempTargets = bgTargets
            break
        } else if (!temptargets_data[i].targetBottom || !temptargets_data[i].targetTop) {
            console_error(
                final_result,
                `eventualBG target range invalid: ${temptargets_data[i].targetBottom}-${temptargets_data[i].targetTop}`
            )
            break
        } else if (now >= start && now < expires) {
            //console.error(temptargets_data[i]);
            tempTargets.high = temptargets_data[i].targetTop
            tempTargets.low = temptargets_data[i].targetBottom
            tempTargets.temptargetSet = true
            break
        }
    }
    bgTargets = tempTargets
    //console.error(bgTargets);

    return bgTargets
}

export function bound_target_range(target: BgTarget) {
    // if targets are < 20, assume for safety that they're intended to be mmol/L, and convert to mg/dL
    if (target.high < 20) {
        target.high = target.high * 18
    }
    if (target.low < 20) {
        target.low = target.low * 18
    }
    return {
        ...target,
        // hard-code lower bounds for min_bg and max_bg in case pump is set too low, or units are wrong
        // hard-code upper bound for min_bg in case pump is set too high
        max_bg: Math.min(200, Math.max(80, target.high)),
        min_bg: Math.min(200, Math.max(80, target.low)),
    }
}

bgTargetsLookup.bgTargetsLookup = bgTargetsLookup // does use log
bgTargetsLookup.lookup = lookup // not used outside
bgTargetsLookup.bound_target_range = bound_target_range // does not log
exports = module.exports = bgTargetsLookup
