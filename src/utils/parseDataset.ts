import { parse, isValid } from 'date-fns'

export const parseDataset = (rawData: any[], dateFormat: string = 'dd.MM.yyyy HH:mm:ss.SSS') => {
  if (rawData.length < 2) {
    throw new Error('Dataset must have at least a header row and one data row.')
  }

  const headerRow = rawData[0]
  const unitsRow = rawData[1]
  const dataRows = rawData.slice(2)

  const parsedData = dataRows.map((row) => {
    const parsedRow = [...row]
    try {
      // Check if the first column is already in ISO format
      const firstColumn = row[0]?.trim()
      const isISODate = !isNaN(Date.parse(firstColumn)) // Check if it's a valid ISO string

      if (isISODate) {
        parsedRow[0] = firstColumn // Keep the ISO string as-is
      } else {
        // Parse the first column (time.string) as a Date
        const parsedDate = parse(firstColumn, dateFormat, new Date())
        if (!isValid(parsedDate)) {
          throw new Error(`Invalid date format: ${firstColumn}`)
        }
        parsedRow[0] = parsedDate.toISOString() // Convert Date to ISO string
      }
    } catch (error) {
      console.error(`Error parsing date: ${row[0]}`, error)
      parsedRow[0] = row[0] // Keep the original string if parsing fails
    }
    return parsedRow
  })

  return [headerRow, unitsRow, ...parsedData]
}