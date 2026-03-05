import path from 'path'
import readline_sync from 'readline-sync'
import { MaterialsService } from './services/materialsService.js'
import { execSync } from 'child_process'

class AppService extends MaterialsService {}

async function main() {
	if (process.platform === 'win32') {
		execSync('chcp 65001 > nul') // Установка кодировки UTF-8 в Windows
	}

	console.log('=================================')
	console.log('  СИСТЕМА ФОРМИРОВАНИЯ ЗАЯВОК')
	console.log('  Строительные материалы')
	console.log('=================================')
	// Константы

	const service = new AppService()
	const data_file = path.join('data', 'materials.xlsx')
	const materials = await service.loadMaterials(data_file)
	const selected_region = service.selectRegion()
	
	service.showMaterials(materials, selected_region)
	
	// Выбор материала
	const selected_material = service.selectMaterial(materials, selected_region)
	const current_price = selected_material.prices[selected_region]
	
	// Отображение текущего заказа
	console.log('\n=== Текущий заказ ===')
	console.log(`Товар: ${selected_material.name}`)
	console.log(`Категория: ${selected_material.category}`)
	console.log(`Регион: ${selected_region}`)
	console.log(`Цена: ${current_price} руб.`)
	
	const confirm = readline_sync.question('\nОформляем заявку? (y/n): ').toLowerCase()
	
	if (confirm === 'y') {
		const order_data = {
			region: selected_region,
			material: {
				name: selected_material.name,
				category: selected_material.category,
				price: current_price
			},
			status: 'confirmed'
		}

		await service.saveOrder(order_data)
		console.log('✅ Заявка успешно оформлена!')
		
	} else if (confirm === 'n') {
		console.log('\n=== Формируем лучшее предложение ===')
		
		const better_offer = service.generateBetterOffer(materials, selected_material, selected_region)
		
		if (better_offer) {
			console.log(better_offer.message)
			
			// Предложение улучшенного варианта
			const accept_offer = readline_sync.question('\nПринимаете предложение? (y/n): ').toLowerCase()

			if (accept_offer === 'y') {
				const final_material = better_offer.type == 'discount' ? better_offer.material : better_offer.material
				const final_price = better_offer.type == 'discount' ? better_offer.newPrice : better_offer.newPrice
				const order_data = {
					region: selected_region,
					material: {
						name: final_material.name,
						category: final_material.category,
						price: final_price,
						originalPrice: better_offer.originalPrice
					},
					offerType: better_offer.type,
					status: 'confirmed_with_offer'
				}
				await service.saveOrder(order_data)
				console.log('✅ Заявка с улучшенным предложением оформлена!')
			} else {
				console.log('❌ Заявка отменена.')
				main()
			}
		} else {
			console.log('❌ Заявка отменена.')
			main()
	  }
	} else {
		console.log('❌ Заявка отменена.')
		main()
	}
	console.log('\n=================================')
}

main()