import { parse, isValid } from 'date-fns'

export const parseDataset = (
  rawData: any[],
  type: string,
  dateFormat: string = 'dd.MM.yyyy HH:mm:ss.SSS'
) => {
  if (rawData.length < 2) {
    throw new Error('Dataset must have at least a header row and one data row.')
  }

  let headerRow = rawData[0]
  let unitsRow = rawData[1]
  let dataRows = rawData.slice(2)

  const parsedData = dataRows.map((row) => {
    const parsedRow = [...row]
    try {
      const firstColumn = row[0]?.trim()
      const isISODate = !isNaN(Date.parse(firstColumn))
      if (isISODate) {
        parsedRow[0] = firstColumn
      } else {
        const parsedDate = parse(firstColumn, dateFormat, new Date())
        if (!isValid(parsedDate)) {
          throw new Error(`Invalid date format: ${firstColumn}`)
        }
        parsedRow[0] = parsedDate.toISOString()
      }
    } catch (error) {
      console.error(`Error parsing date: ${row[0]}`, error)
      parsedRow[0] = row[0]
    }
    return parsedRow
  })

  // AGROSCOPE CO2 LOGIC
  if (type === 'agroscope') {
    // Add 'co2' to header and units
    headerRow = [...headerRow, 'co2']
    unitsRow = [...unitsRow, 'L']

    const phIndex = headerRow.findIndex(
      (col: string) => col.trim().toLowerCase() === 'ph'
    )

    // Calculate CO2 for each row
    for (let i = 0; i < parsedData.length; i++) {
      let co2 = 0
      console.log('Processing row:', i, 'PH index:', phIndex, 'Current row:', parsedData[i])
      if (
        phIndex !== -1 &&
        i > 0 &&
        parsedData[i][phIndex] !== '' &&
        parsedData[i - 1][phIndex] !== '' &&
        !isNaN(Number(parsedData[i][phIndex])) &&
        !isNaN(Number(parsedData[i - 1][phIndex]))
      ) {
        const prevPH = Number(parsedData[i - 1][phIndex])
        const currPH = Number(parsedData[i][phIndex])
        if (currPH < prevPH) {
          console.log('currPH < prevPH, calculating CO2')
          const prevDate = new Date(parsedData[i - 1][0])
          const currDate = new Date(parsedData[i][0])
          const minutes = Math.abs((currDate.getTime() - prevDate.getTime()) / 60000)
          // Skipping CO2 calculation for larger time differences
          
          minutes < 5 ? co2 = 2 * minutes : co2 = 0
        }
      }
      parsedData[i].push(co2)
    }
  }

  return [headerRow, unitsRow, ...parsedData]
}