import { Schema } from '@effect/schema'
import { flow, identity, String } from 'effect'
import * as E from 'effect/Either'
import * as O from 'effect/Order'

export const GlucoseType = Schema.Union(Schema.Literal('sgv', 'cal'), Schema.String)
export type GlucoseType = typeof GlucoseType.Type

const DateFromDisplayTime = Schema.String.pipe(
    Schema.transform(Schema.DateFromString, {
        strict: true,
        decode: String.replace('T', ''),
        encode: identity,
    })
)

const validParsableDate = <A extends string | number | Date>(decoder: Schema.Schema<Date, any, never>) =>
    Schema.filter<Schema.Schema<A>>(flow(Schema.decodeEither(decoder.pipe(Schema.validDate())), E.isRight), {
        title: 'ParsableDate',
    })

const DisplayTime = Schema.String.pipe(validParsableDate(DateFromDisplayTime))
const DateString = Schema.String.pipe(validParsableDate(Schema.DateFromString))

const GlucoseField = Schema.Struct({
    glucose: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
})
const NightscoutSgvField = Schema.Struct({
    sgv: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
})

export const GlucoseEntry = Schema.extend(
    Schema.Union(GlucoseField, NightscoutSgvField),
    Schema.Struct({
        date: Schema.optional(Schema.Int.pipe(validParsableDate(Schema.DateFromNumber))),
        display_time: Schema.optional(DisplayTime),
        dateString: Schema.optional(DateString),
        //sgv: Schema.optional(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))),
        //glucose: Schema.optional(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))),
        type: Schema.optional(GlucoseType),
        device: Schema.optional(Schema.String),
        noise: Schema.optional(Schema.Number),
        xDrip_started_at: Schema.optional(Schema.Unknown),
    })
).annotations({
    title: 'GlucoseEntry',
    description: 'Glucose Entry',
})

export type GlucoseEntry = typeof GlucoseEntry.Type

export const getGlucose = (entry: GlucoseEntry) => (Schema.is(GlucoseField)(entry) ? entry.glucose : entry.sgv)

export const getDate = (entry: GlucoseEntry): Date => {
    if (entry.date) {
        return Schema.decodeSync(Schema.DateFromNumber)(entry.date)
    } else if (entry.dateString) {
        return Schema.decodeSync(Schema.DateFromString)(entry.dateString)
    } else if (entry.display_time) {
        return Schema.decodeSync(DateFromDisplayTime)(entry.display_time)
    }

    throw new Error('Unable to get a valid glucose entry date')
}

const OrderByDate = O.mapInput<Date | undefined, GlucoseEntry>(
    (a, b) => (!a || !b ? 0 : O.Date(a, b)),
    a => (a.date ? Schema.decodeSync(Schema.DateFromNumber)(a.date) : undefined)
)

const OrderByDateString = O.mapInput<Date | undefined, GlucoseEntry>(
    (a, b) => (!a || !b ? 0 : O.Date(a, b)),
    a => (a.dateString ? Schema.decodeSync(Schema.DateFromString)(a.dateString) : undefined)
)

const OrderByDisplayTime = O.mapInput<Date | undefined, GlucoseEntry>(
    (a, b) => (!a || !b ? 0 : O.Date(a, b)),
    a => (a.display_time ? Schema.decodeSync(DateFromDisplayTime)(a.display_time) : undefined)
)

export const Order: O.Order<GlucoseEntry> = O.combineAll([OrderByDate, OrderByDateString, OrderByDisplayTime])
