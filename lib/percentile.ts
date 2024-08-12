// From https://gist.github.com/IceCreamYou/6ffa1b18c4c8f6aeaad2
// Returns the value at a given percentile in a sorted numeric array.
// "Linear interpolation between closest ranks" method
export default function percentile(arr: number[], p: number) {
    if (arr.length === 0) {
        return 0
    }
    if (typeof p !== 'number') {
        throw new TypeError('p must be a number')
    }
    if (p <= 0) {
        return arr[0]
    }
    if (p >= 1) {
        return arr[arr.length - 1]
    }

    const index = arr.length * p,
        lower = Math.floor(index),
        upper = lower + 1,
        weight = index % 1

    if (upper >= arr.length) {
        return arr[lower]
    }
    return arr[lower] * (1 - weight) + arr[upper] * weight
}
