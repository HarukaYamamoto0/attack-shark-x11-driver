export function diffStrings(a: string, b: string) {
    const RED = "\x1b[31m"
    const GREEN = "\x1b[32m"
    const GRAY = "\x1b[90m"
    const RESET = "\x1b[0m"

    const maxLength = Math.max(a.length, b.length)

    let resultA = ""
    let resultB = ""

    for (let i = 0; i < maxLength; i++) {
        const charA = a[i]
        const charB = b[i]

        if (charA === charB) {
            resultA += GRAY + (charA ?? "") + RESET
            resultB += GRAY + (charB ?? "") + RESET
        } else {
            if (charA !== undefined) {
                resultA += RED + charA + RESET
            }
            if (charB !== undefined) {
                resultB += GREEN + charB + RESET
            }
        }
    }

    // console.log("Original:")
    // console.log(resultA)
    console.log("\nModified:")
    console.log(resultB)
}