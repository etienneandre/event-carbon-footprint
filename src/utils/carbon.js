
import vehiclesFactorsJson from '../data/vehicles.json'
import transportsFactorsJson from '../data/transports.json'
import foodFactorsJson from '../data/meals.json'

export class TravelEmissions {
  constructor(vehiclesFactors = vehiclesFactorsJson, transportsFactors = transportsFactorsJson) {
    this.vehiclesFactors = vehiclesFactors
    this.transportsFactors = transportsFactors
    this.TRANSPORT_CORRECTIONS = {
      PLANE: d => d + 95,
      CAR: d => 1.2 * d,
      CAB: d => 1.3 * d,
      BUS: d => 1.3 * d,
      TRAIN: d => 1.5 * d,
      TRAM: d => 1.5 * d,
      RER: d => 1.2 * d,
      SUBWAY: d => 1.7 * d,
      FERRY: d => 1.0 * d,
    }
  }

  correctDistance(transport, distance, carpooling, isRoundTrip) {
    const correctionFunc = this.TRANSPORT_CORRECTIONS[transport] || (d => d)
    let corrected = correctionFunc(distance)
    if (transport === 'CAB') corrected *= (1 + 1 / carpooling)
    else if (transport === 'CAR') corrected /= carpooling
    if (isRoundTrip) corrected *= 2
    return corrected
  }

  travelScope(depCountry, destCountry) {
    if (!depCountry || !destCountry) return null
    if (depCountry === 'FR' && destCountry === 'FR') return 'NA'
    if (depCountry === 'FR' || destCountry === 'FR') return 'MX'
    return 'IN'
  }

  transportMode(transport, distance) {
    const t = transport.toUpperCase()
    if (t === 'PLANE') {
      if (distance < 1000) return ['plane', 'shorthaul.contrails']
      if (distance < 3501) return ['plane', 'mediumhaul.contrails']
      return ['plane', 'longhaul.contrails']
    }
    if (t === 'CAR' || t === 'CAB') return ['car', 'unknown.engine']
    if (t === 'BUS') return ['bus', 'bus.intercity']
    if (t === 'TRAM') return ['railway', 'tram.bigcity']
    if (t === 'RER') return ['railway', 'rer']
    if (t === 'SUBWAY') return ['railway', 'subway']
    if (t === 'FERRY') return ['boat', 'ferry']
    return [null, null]
  }

  getFactor(transport, mode, year) {
    const [category, subcategory] = mode
    if (!category || !subcategory) return null
    const factorsSource = (transport === 'CAR' || transport === 'CAB') ? this.vehiclesFactors : this.transportsFactors
    const factorEntry = factorsSource[category]?.[subcategory]
    if (!factorEntry) return null
    const decomposition = factorEntry.decomposition || {}
    return decomposition[year] || decomposition[Object.keys(decomposition)[0]]
  }

  carbonFootprint({ transport, distance, carpooling = 1, isRoundTrip = false, year = '2023' }) {
    const correctedDistance = this.correctDistance(transport, distance, carpooling, isRoundTrip)
    let factorValue

    if (transport.toUpperCase() === 'TRAIN') {
      factorValue = 0.0083
    } else {
      const mode = this.transportMode(transport, correctedDistance)
      const factor = this.getFactor(transport, mode, year)
      if (!factor) return null
      factorValue = factor.total?.total
      if (!factorValue) return null
    }

    return correctedDistance * factorValue
  }
}

export class FoodEmissions {
  constructor(foodFactors = foodFactorsJson) {
    this.foodFactors = foodFactors
  }

  getType(mealCategory) {
    if (mealCategory === 'vegan') {
      return ['vegan']
    } else if (mealCategory === 'vegetarian') {
      return ['vegetarian']
    } else if (mealCategory === 'nonVegetarian') {
      return ['classic.meet1', 'classic.meet2', 'classic.fish1', 'classic.fish2']
    } else if (mealCategory === 'meat') {
      return ['classic.meet1', 'classic.meet2']
    } else if (mealCategory === 'fish') {
      return ['classic.fish1', 'classic.fish2']
    } else {
      return []
    }
  }

  getFactor(mealType, year) {
    const meal = this.foodFactors[mealType]
    const decomposition = meal.decomposition
    const totalEntry = decomposition[year]?.total.total || decomposition[Object.keys(decomposition)[0]]?.total.total
    return totalEntry ?? null
  }

  getFactorByCategory(mealCategory, year) {
    const types = this.getType(mealCategory)
    if (types.length === 0) return 0
    let totalFactor = 0
    for (const type of types) {
      const factor = this.getFactor(type, year)
      totalFactor += factor
    }
    return totalFactor / types.length
  }

  carbonFootprint(mealCategory, mealCount, year = '2021') {
    const moyFactor = this.getFactorByCategory(mealCategory, year)
    const carbon = mealCount * moyFactor
    return { moyFactor, mealCount, carbon }
  }
}