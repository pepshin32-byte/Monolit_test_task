import fs from 'fs'
import path from 'path'
import readline_sync from 'readline-sync'
import exceljs from 'exceljs'

export class MaterialsService {
	constructor() {}

	async loadMaterials(data_file) {
		try {
			const workbook = new exceljs.Workbook()
			await workbook.xlsx.readFile(data_file)
			const ws = workbook.getWorksheet(1)
			const materials = []
			const firstRow = 2
			for (let i = firstRow; i <= ws.rowCount; i++) {
				const row = ws.getRow(i)
				const material = {
					name: row.getCell(1).value,
					category: row.getCell(2).value,
					prices: {
						'СПБ': row.getCell(3).value,
						'Москва': row.getCell(4).value,
						'КРД': row.getCell(5).value
					}
				}
				if (ws.getRow(i).values.length < 2) {
					break
				}
				materials.push(material)
			}
			return materials
		} catch (error) {
			console.error('Ошибка загрузки данных:', error.message)
			console.log('Убедитесь, что файл data/materials.xlsx существует и содержит корректные данные')
			process.exit(1)
		}
	}

	selectRegion() {
		const regions = ['СПБ', 'Москва', 'КРД']
		console.log('\n=== Выбор региона ===')
		regions.forEach((region, index) => {
			console.log(`${index + 1}. ${region}`)
		})
		const choice = readline_sync.questionInt('Выберите регион (введите номер): ')

		if (choice < 1 || choice > regions.length) {
			console.log('Неверный выбор. Попробуйте снова.')
			return this.selectRegion(regions)
		}
		return regions[choice - 1]
	}

	showMaterials(materials, region) {
		console.log(materials, region)
		console.log(`\n=== Доступные материалы в регионе ${region} ===`)
		materials.forEach((material, index) => {
			const price = material.prices[region]
			console.log(`${index + 1}. ${material.name} - ${price} руб. (${material.category})`)
		})
	}

	selectMaterial(materials, region) {
		const choice = readline_sync.questionInt('Выберите материал (введите номер): ')

		if (choice < 1 || choice > materials.length) {
			console.log('Неверный выбор. Попробуйте снова.')
			return this.selectMaterial(materials, region)
		}

		return materials[choice - 1]
	}

	findCheapestInCategory(materials, category, region) {
		const category_materials = materials.filter(m => m.category === category)
		let cheapest = null
		let min_price = Infinity

		category_materials.forEach(material => {
			const price = material.prices[region]
			if (price < min_price) {
				min_price = price
				cheapest = material
			}
		})

		return { material: cheapest, price: min_price }
	}

	generateBetterOffer(materials, selected_material, region) {
		const category = selected_material.category
		const current_price = selected_material.prices[region]

		const { material: cheapest, price: cheapest_price } =
			this.findCheapestInCategory(materials, category, region)

		if (cheapest && cheapest.name === selected_material.name) {
			const discounted_price = Math.round(current_price * 0.95 * 100) / 100
			return {
				type: 'discount',
				material: selected_material,
				originalPrice: current_price,
				newPrice: discounted_price,
				message: `Предлагаем скидку 5%: ${discounted_price} руб. вместо ${current_price} руб.`
			}
		}

		if (cheapest) {
			const price_diff = current_price - cheapest_price
			const savings_percent = Math.round((price_diff / current_price) * 100)

			return {
				type: 'cheaper_alternative',
				material: cheapest,
				originalMaterial: selected_material,
				originalPrice: current_price,
				newPrice: cheapest_price,
				message: `Нашли более дешевый аналог: ${cheapest.name} за ${cheapest_price} руб. (экономия ${price_diff} руб., ${savings_percent}%)`
			}
		}

		return null
	}

	async saveOrder(order_data) {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
		const filename = `order_${timestamp}.json`
		const file_path = path.join('orders', filename)

		const order = {
			...order_data,
			createdAt: new Date().toISOString()
		}

		await fs.promises.writeFile(file_path, JSON.stringify(order, null, 2), 'utf8')
		console.log(`\n✅ Заявка сохранена в файл: ${filename}`)
		return file_path
	}
}

