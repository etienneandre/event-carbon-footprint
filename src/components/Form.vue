<template>
  <section class="section">
    <div class="container">
      <h1 class="title has-text-centered has-text-secondary mb-6">Event Carbon Calculator</h1>
      
      <div class="columns is-centered mb-6">
        <div class="column is-2">
          <div class="field">
            <label class="label has-text-link">Version of data</label>
            <div class="select is-link has-text-weight-semibold">
              <select v-model.number="form.year" required>
                <option value="2021">2021</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="columns is-centered mb-6">
        <div class="column is-8">
          <div class="box p-6">
            <h2 class="subtitle has-text-secondary mb-6 has-text-weight-semibold">Number of Meals</h2>
            <div class="columns is-variable is-8">
              <div class="column" v-for="meal in mealTypes" :key="meal.key">
                <div class="field mb-6">
                  <label class="label has-text-link">{{ meal.label }}</label>
                  <input
                    required
                    class="input is-link has-text-weight-semibold"
                    type="number"
                    min="0"
                    :placeholder="0"
                    v-model.number="form[meal.key]"
                  />
                  <p class="is-size-7 has-text-grey mt-1">
                    Factor: {{ meal.factor }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="columns is-centered mb-6">
        <div class="column is-12">
          <div class="box p-6">
            <h2 class="subtitle has-text-secondary mb-6 has-text-weight-semibold">Number of Participants</h2>
            <div class="columns is-multiline is-variable is-8">
              <div class="column is-4" v-for="transport in transports" :key="transport.key">
                <fieldset class="p-6 has-background-light rounded-lg">
                  <legend class="has-text-weight-bold has-text-link mb-5 px-2">{{ transport.label }}</legend>
                  <div class="field mb-5">
                    <label class="label">Passengers by {{ transport.label.toLowerCase() }}</label>
                    <input
                      required
                      class="input"
                      type="number"
                      min="0"
                      :placeholder="0"
                      v-model.number="form[transport.countKey]"
                    />
                  </div>
                  <div class="field mt-5">
                    <label class="label">Average distance per person (km)</label>
                    <input
                      required
                      class="input"
                      type="number"
                      min="0"
                      :placeholder="0"
                      v-model.number="form[transport.avgKmKey]"
                    />
                  </div>
                </fieldset>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="columns is-centered mb-6">
        <div class="column is-2">
          <button class="button is-dark is-fullwidth is-medium" @click="calculate">Calculate</button>
        </div>
      </div>

      <div v-if="calculated" class="columns is-centered">
        <div class="column is-6">
          <div class="box p-6 has-text-centered">
            <h2 class="subtitle has-text-weight-bold mb-5 has-text-secondary">Results</h2>
            <p class="mb-4" v-for="(emission, idx) in mealEmissions" :key="idx">
              <strong class="has-text-dark">{{ emission.label }} emissions:</strong> {{ formatKg(emission.value) }} kg CO₂e
            </p>
            <p class="mb-4" v-for="(emission, idx) in travelEmissionsList" :key="'t' + idx">
              <strong class="has-text-dark">{{ emission.label }} travel emissions:</strong> {{ formatKg(emission.value) }} kg CO₂e
            </p>
            <hr class="my-5" />
            <p class="is-size-4 has-text-weight-bold">Total: {{ formatKg(totalEmissionsKg) }} kg CO₂e</p>
          </div>
        </div>
      </div>

      <div v-if="calculated" class="columns is-centered is-variable is-8 mt-6">
        <div class="column is-4">
          <div class="card">
            <header class="card-header has-background-link">
              <p class="card-header-title has-text-white">Total Emissions</p>
            </header>
            <div class="card-content">
              <canvas ref="totalChartRef" class="chart-canvas"></canvas>
            </div>
          </div>
        </div>
        <div class="column is-4">
          <div class="card">
            <header class="card-header has-background-link">
              <p class="card-header-title has-text-white">Travel Emissions</p>
            </header>
            <div class="card-content">
              <canvas ref="travelChartRef" class="chart-canvas"></canvas>
            </div>
          </div>
        </div>
        <div class="column is-4">
          <div class="card">
            <header class="card-header has-background-link">
              <p class="card-header-title has-text-white">Meals Emissions</p>
            </header>
            <div class="card-content">
              <canvas ref="mealsChartRef" class="chart-canvas"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount, watch } from 'vue'
import { Chart, PieController, ArcElement, Tooltip, Legend } from 'chart.js'
import { TravelEmissions, FoodEmissions } from '../utils/carbon.js'

Chart.register(PieController, ArcElement, Tooltip, Legend)

const form = ref({
  year: 2021,
  veganMeals: 50,
  vegMeals: 100,
  nonVegMeals: 200,
  trainCount: 60,
  trainAvgKm: 500,
  planeCount: 30,
  planeAvgKm: 1500,
  carCount: 5,
  carAvgKm: 300,
})

const calculated = ref(false)
const mealsChartRef = ref(null)
const travelChartRef = ref(null)
const totalChartRef = ref(null)
let mealsPieChart = null
let travelPieChart = null
let totalPieChart = null

const foodEmissions = new FoodEmissions()
const travelEmissions = new TravelEmissions()

const mealTypes = ref([
  { key: 'veganMeals', label: 'Vegan', typeKey: 'vegan', factor: 0 },
  { key: 'vegMeals', label: 'Vegetarian', typeKey: 'vegetarian', factor: 0 },
  { key: 'nonVegMeals', label: 'Non-vegetarian', typeKey: 'nonVegetarian', factor: 0 },
])

watch(() => form.value.year, (newYear) => {
  mealTypes.value.forEach(meal => {
    meal.factor = foodEmissions.getFactorByCategory(meal.typeKey, newYear)
  })
}, { immediate: true })

const transports = [
  { key: 'train', label: 'Train', countKey: 'trainCount', avgKmKey: 'trainAvgKm', transportCode: 'TRAIN' },
  { key: 'plane', label: 'Plane', countKey: 'planeCount', avgKmKey: 'planeAvgKm', transportCode: 'PLANE' },
  { key: 'car', label: 'Car', countKey: 'carCount', avgKmKey: 'carAvgKm', transportCode: 'CAR' },
]

const mealEmissions = computed(() =>
  mealTypes.value.map(({ typeKey, key, label }) => {
    const result = foodEmissions.carbonFootprint(typeKey, form.value[key], form.value.year)
    return {
      label,
      value: result.carbon
    }
  })
)

const travelEmissionsList = computed(() =>
  transports.map(({ transportCode, countKey, avgKmKey, label }) => ({
    label,
    value: travelEmissions.carbonFootprint({
      transport: transportCode,
      distance: form.value[avgKmKey],
      year: form.value.year,
    }) * form.value[countKey]
  }))
)

const totalEmissionsList = computed(() => ({
  Meals: mealEmissions.value.reduce((sum, e) => sum + e.value, 0),
  Travels: travelEmissionsList.value.reduce((sum, e) => sum + e.value, 0)
}))

const totalEmissionsKg = computed(() =>
  totalEmissionsList.value.Meals + totalEmissionsList.value.Travels
)

function formatKg(n) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function getSortedBackgroundColors(data, colors) {
  const sortedIndexes = data
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value)
    .map(item => item.index)
  const backgroundColor = []
  sortedIndexes.forEach((dataIndex, order) => {
    backgroundColor[dataIndex] = colors[order] || colors[colors.length - 1]
  })
  return backgroundColor
}

const basePieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
}

function buildPieChart(refEl, chartInstance, labels, data, colors) {
  if (!refEl.value) return chartInstance
  const ctx = refEl.value.getContext('2d')
  const backgroundColor = getSortedBackgroundColors(data, colors)
  if (chartInstance) {
    chartInstance.data.labels = labels
    chartInstance.data.datasets[0].data = data
    chartInstance.data.datasets[0].backgroundColor = backgroundColor
    chartInstance.update()
    return chartInstance
  }
  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor,
        borderColor: 'white',
        borderWidth: 2
      }]
    },
    options: basePieOptions
  })
}

function buildMealsChart() {
  mealsPieChart = buildPieChart(
    mealsChartRef,
    mealsPieChart,
    mealTypes.value.map(m => m.label),
    mealEmissions.value.map(e => e.value),
    ['#153f6e','#2b5f91','#4b7f99']
  )
}

function buildTravelChart() {
  travelPieChart = buildPieChart(
    travelChartRef,
    travelPieChart,
    transports.map(t => t.label),
    travelEmissionsList.value.map(e => e.value),
    ['#440154', '#482777', '#3E4989']
  )
}

function buildTotalChart() {
  totalPieChart = buildPieChart(
    totalChartRef,
    totalPieChart,
    ['Meals', 'Travels'],
    Object.values(totalEmissionsList.value),
    ['#1F9E89', '#35B779']
  )
}

function calculate() {
  calculated.value = true
  nextTick(() => {
    buildMealsChart()
    buildTravelChart()
    buildTotalChart()
  })
}

onBeforeUnmount(() => {
  if (mealsPieChart) mealsPieChart.destroy()
  if (travelPieChart) travelPieChart.destroy()
  if (totalPieChart) totalPieChart.destroy()
})
</script>

<style scoped>
.chart-canvas {
  width: 100%;
  height: 350px;
  max-height: 350px;
}
</style>